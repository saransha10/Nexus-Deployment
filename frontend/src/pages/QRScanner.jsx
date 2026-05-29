import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { 
  Box, 
  Typography, 
  Button, 
  Card,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
  Alert,
  Snackbar
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import api from '../services/api';

function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
  const [availableCameras, setAvailableCameras] = useState([]);
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Get available cameras on component mount
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(cameras);
      } catch (err) {
        console.log('Could not enumerate cameras:', err);
      }
    };
    getCameras();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Safari-specific: Attach stream AFTER video renders
  useEffect(() => {
    if (scanning && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      
      video.srcObject = streamRef.current;
      
      video.onloadedmetadata = () => {
        video.play()
          .then(() => {
            console.log('Safari video playing');
            setCameraLoading(false);
            startQRDetection();
          })
          .catch(err => {
            console.error('Safari play error:', err);
            setCameraError('Click again to start camera');
          });
      };
    }
  }, [scanning]);

  const handleStartScanning = async () => {
    try {
      setCameraError('');
      setCameraLoading(true);
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;
      setScanning(true); // 🔥 triggers useEffect
    } catch (err) {
      console.error(err);
      setCameraError(err.message);
      setCameraLoading(false);
    }
  };

  const stopScanning = () => {
    console.log('Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
    setCameraLoading(false);
    setDebugInfo('');
    setCameraError('');
  };

  const startQRDetection = () => {
    const detectQR = () => {
      if (!videoRef.current || !canvasRef.current || !streamRef.current) {
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Handle mirroring based on camera type
        context.save();
        
        if (facingMode === 'user') {
          // Front camera: flip horizontally for QR detection (but keep display mirrored)
          context.scale(-1, 1);
          context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        } else {
          // Back camera: no flipping needed
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        
        context.restore();
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth"
        });
        
        if (code && !isProcessing) {
          console.log("QR FOUND:", code.data);
          setIsProcessing(true);
          setDebugInfo(`QR Found: ${code.data.substring(0, 30)}...`);
          processQRCode(code.data);
        } else {
          // Debug: Show scanning status
          setDebugInfo(`Resolution: ${video.videoWidth}x${video.videoHeight} | Scanning...`);
        }
      } else {
        setDebugInfo(`Waiting for camera... Ready: ${video.readyState}, Size: ${video.videoWidth}x${video.videoHeight}`);
      }
      
      // Continue scanning if stream is still active (NEVER STOP THE LOOP)
      if (streamRef.current && scanning) {
        requestAnimationFrame(detectQR);
      }
    };
    
    detectQR();
  };

  const processQRCode = async (detectedQRCode) => {
    try {
      setError('');
      console.log('Processing QR code:', detectedQRCode.substring(0, 50) + '...');
      
      const response = await api.post('/tickets/validate-qr', { qr_code: detectedQRCode });
      
      // Add to recent check-ins
      const newCheckIn = {
        id: response.data.ticket.ticket_id,
        name: response.data.ticket.attendee_name,
        email: response.data.ticket.attendee_email,
        ticketType: response.data.ticket.ticket_type,
        time: new Date().toLocaleTimeString(),
        isReEntry: response.data.reEntry || false,
        firstEntry: response.data.firstEntry || false
      };
      
      setRecentCheckIns(prev => [newCheckIn, ...prev.slice(0, 9)]); // Keep last 10
      setSuccess(response.data.message);
      
      // Reset processing lock after delay to allow next scan
      setTimeout(() => {
        setIsProcessing(false);
        setDebugInfo('Ready for next scan...');
      }, 1500);
      
    } catch (err) {
      console.error('QR validation error:', err);
      
      let errorMessage = 'Failed to validate QR code';
      
      if (err.response?.status === 400) {
        const serverError = err.response?.data?.error || 'Invalid QR code format';
        
        // Check if it's an event timing error
        if (serverError.includes('Event entry not yet available') || 
            serverError.includes('not yet available') ||
            serverError.includes('Too early')) {
          errorMessage = `⏰ Event Not Started\n\n${serverError}`;
          
          // Show event start time if available
          if (err.response?.data?.event_start) {
            errorMessage += `\n\nEvent starts: ${err.response.data.event_start}`;
          }
          if (err.response?.data?.entry_opens) {
            errorMessage += `\nEntry opens: ${err.response.data.entry_opens}`;
          }
        } else if (serverError.includes('Event has ended')) {
          errorMessage = `⏰ Event Ended\n\n${serverError}`;
        } else {
          errorMessage = serverError;
        }
      } else if (err.response?.status === 401) {
        errorMessage = 'Please log in to scan QR codes';
      } else if (err.response?.status === 403) {
        errorMessage = 'Only organizers can scan QR codes';
      } else if (err.response?.status === 404) {
        errorMessage = 'Ticket not found';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
      
      // Reset processing lock after error
      setTimeout(() => {
        setIsProcessing(false);
        setDebugInfo('Ready for next scan...');
      }, 2500); // Longer delay for timing errors so organizer can read the message
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (isProcessing) {
      setError('Please wait, currently processing another QR code...');
      return;
    }

    setIsProcessing(true);
    setDebugInfo('Processing uploaded image...');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Create a canvas to process the uploaded image
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img, 0, 0);
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          
          // Try to detect QR code in uploaded image with multiple attempts
          let code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });
          
          // If first attempt fails, try other settings
          if (!code) {
            code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });
          }
          
          if (!code) {
            code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "onlyInvert",
            });
          }
          
          if (code) {
            console.log('QR Code detected in uploaded image:', code.data);
            setDebugInfo(`QR Found in upload: ${code.data.substring(0, 30)}...`);
            setSuccess('QR code detected from uploaded image!');
            processQRCode(code.data);
          } else {
            setError('No QR code found in the uploaded image. Please try a clearer image or use camera scanning.');
            setIsProcessing(false);
            setDebugInfo('Upload failed - no QR detected');
          }
        } catch (error) {
          console.error('Error processing uploaded image:', error);
          setError('Failed to process uploaded image. Please try again.');
          setIsProcessing(false);
          setDebugInfo('Upload processing error');
        }
      };
      
      img.onerror = () => {
        setError('Failed to load uploaded image. Please try a different image.');
        setIsProcessing(false);
        setDebugInfo('Image load error');
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = () => {
      setError('Failed to read uploaded file. Please try again.');
      setIsProcessing(false);
      setDebugInfo('File read error');
    };
    
    reader.readAsDataURL(file);
    
    // Reset the input
    event.target.value = '';
  };

  const handleManualEntry = async () => {
    if (!qrCode.trim()) {
      setError('Please enter a QR code');
      return;
    }

    if (isProcessing) {
      setError('Please wait, currently processing another QR code...');
      return;
    }

    setIsProcessing(true);
    setDebugInfo('Processing manual entry...');
    
    await processQRCode(qrCode);
    setQrCode('');
    setManualEntryOpen(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e5e7eb', px: 4, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
              QR Scanner
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Scan attendee tickets to check them in
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            {availableCameras.length > 1 && (
              <Button
                variant="outlined"
                onClick={() => {
                  const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
                  setFacingMode(newFacingMode);
                  if (scanning) {
                    stopScanning();
                    setTimeout(() => handleStartScanning(), 100);
                  }
                }}
                sx={{ 
                  borderColor: '#e5e7eb',
                  color: '#6b7280',
                  textTransform: 'none',
                  minWidth: 'auto',
                  px: 2
                }}
              >
                📷 {facingMode === 'user' ? 'Front' : 'Back'}
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<KeyboardIcon />}
              onClick={() => setManualEntryOpen(true)}
              sx={{ 
                borderColor: '#e5e7eb',
                color: '#6b7280',
                textTransform: 'none'
              }}
            >
              Manual Entry
            </Button>
            <Button
              variant="outlined"
              startIcon={<QrCodeScannerIcon />}
              onClick={() => document.getElementById('qr-file-input').click()}
              sx={{ 
                borderColor: '#e5e7eb',
                color: '#6b7280',
                textTransform: 'none'
              }}
            >
              Upload QR
            </Button>
            <input
              id="qr-file-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ maxWidth: '100%', mx: 'auto', px: 4, py: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 400px' }, gap: 3 }}>
          {/* Left Column - Camera Scanner */}
          <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Camera Scanner
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', mb: 3 }}>
              Position the QR code within the frame
            </Typography>
            
            {/* Debug Info */}
            {debugInfo && (
              <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 2, fontFamily: 'monospace' }}>
                Debug: {debugInfo}
              </Typography>
            )}

            {/* Camera View */}
            <Box sx={{ 
              position: 'relative',
              bgcolor: '#1a1f2e',
              borderRadius: 2,
              overflow: 'hidden',
              aspectRatio: '16/9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {cameraError && (
                <Box sx={{ textAlign: 'center', color: 'white', p: 3 }}>
                  <ErrorIcon sx={{ fontSize: 48, mb: 2 }} />
                  <Typography sx={{ mb: 2 }}>{cameraError}</Typography>
                  <Button
                    variant="contained"
                    onClick={handleStartScanning}
                    sx={{ 
                      bgcolor: '#0891b2',
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#0e7490' }
                    }}
                  >
                    Try Again
                  </Button>
                </Box>
              )}

              {!scanning && !cameraLoading && !cameraError && (
                <Button
                  variant="contained"
                  startIcon={<QrCodeScannerIcon />}
                  onClick={handleStartScanning}
                  sx={{ 
                    bgcolor: '#0891b2',
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#0e7490' }
                  }}
                >
                  Start Scanning
                </Button>
              )}

              {(scanning || cameraLoading) && (
                <Box sx={{ 
                  width: '100%', 
                  height: '100%',
                  position: 'relative'
                }}>
                  <video 
                    ref={videoRef}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover'
                      // Removed mirroring - front camera now shows normal view
                    }}
                    playsInline
                    muted
                    autoPlay
                  />
                  <canvas 
                    ref={canvasRef}
                    style={{ display: 'none' }}
                  />

                  {/* Loading overlay */}
                  {cameraLoading && (
                    <Box sx={{
                      position: 'absolute',
                      inset: 0,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      gap: 2
                    }}>
                      <QrCodeScannerIcon sx={{ 
                        fontSize: 48, 
                        '@keyframes pulse': {
                          '0%': { opacity: 1 },
                          '50%': { opacity: 0.5 },
                          '100%': { opacity: 1 }
                        },
                        animation: 'pulse 1.5s infinite'
                      }} />
                      <Typography>Starting camera...</Typography>
                      <Button
                        variant="outlined"
                        onClick={stopScanning}
                        sx={{ 
                          borderColor: 'white',
                          color: 'white',
                          textTransform: 'none',
                          '&:hover': { borderColor: '#f3f4f6', bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                      >
                        Cancel
                      </Button>
                      {/* Safari fallback button */}
                      <Button
                        variant="contained"
                        onClick={() => videoRef.current?.play()}
                        sx={{ 
                          bgcolor: '#0891b2',
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#0e7490' }
                        }}
                      >
                        Tap to Start Camera
                      </Button>
                    </Box>
                  )}

                  {/* Scanner overlay */}
                  {scanning && !cameraLoading && (
                    <>
                      <Box sx={{
                        position: 'absolute',
                        width: 250,
                        height: 250,
                        border: '3px solid #0891b2',
                        borderRadius: 2,
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                        '@keyframes scanPulse': {
                          '0%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
                          '50%': { opacity: 0.7, transform: 'translate(-50%, -50%) scale(1.02)' },
                          '100%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }
                        },
                        animation: 'scanPulse 2s infinite'
                      }} />
                      
                      {/* Stop button */}
                      <Button
                        variant="contained"
                        onClick={stopScanning}
                        sx={{
                          position: 'absolute',
                          bottom: 20,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          bgcolor: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          textTransform: 'none',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                        }}
                      >
                        Stop Scanning
                      </Button>
                    </>
                  )}
                </Box>
              )}
            </Box>
          </Card>

          {/* Right Column - Recent Check-ins & Instructions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Recent Check-ins */}
            <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Recent Check-ins
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', mb: 3 }}>
                {recentCheckIns.length} attendees checked in
              </Typography>

              {recentCheckIns.length === 0 ? (
                <Box sx={{ 
                  py: 6, 
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2
                }}>
                  <PersonIcon sx={{ fontSize: 48, color: '#d1d5db' }} />
                  <Typography sx={{ color: '#9ca3af' }}>
                    No check-ins yet
                  </Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {recentCheckIns.map((checkIn) => (
                    <ListItem 
                      key={`${checkIn.id}-${checkIn.time}`}
                      sx={{ 
                        px: 0,
                        py: 1.5,
                        borderBottom: '1px solid #f3f4f6',
                        '&:last-child': { borderBottom: 'none' }
                      }}
                    >
                      <Avatar sx={{ 
                        bgcolor: checkIn.isReEntry ? '#f59e0b' : '#0891b2', 
                        mr: 2, 
                        width: 40, 
                        height: 40 
                      }}>
                        {checkIn.isReEntry ? (
                          <Typography sx={{ fontSize: '0.7rem' }}>RE</Typography>
                        ) : (
                          checkIn.name.charAt(0).toUpperCase()
                        )}
                      </Avatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                              {checkIn.name}
                            </Typography>
                            {checkIn.isReEntry && (
                              <Chip 
                                label="Re-entry"
                                size="small"
                                sx={{ 
                                  height: 18,
                                  fontSize: '0.65rem',
                                  bgcolor: '#fef3c7',
                                  color: '#f59e0b'
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label={checkIn.ticketType}
                              size="small"
                              sx={{ 
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: '#dbeafe',
                                color: '#0891b2'
                              }}
                            />
                            <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                              {checkIn.time}
                            </Typography>
                          </Box>
                        }
                      />
                      {checkIn.firstEntry && (
                        <CheckCircleIcon sx={{ color: '#10b981', ml: 1 }} />
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </Card>

            {/* How to Use */}
            <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                How to Use
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ 
                    minWidth: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: '#dbeafe',
                    color: '#0891b2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    1
                  </Box>
                  <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Click "Start Scanning" to activate the camera
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ 
                    minWidth: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: '#dbeafe',
                    color: '#0891b2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    2
                  </Box>
                  <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Position the attendee's QR code within the frame
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ 
                    minWidth: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: '#dbeafe',
                    color: '#0891b2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    3
                  </Box>
                  <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    The system will automatically detect and check in the attendee
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ 
                    minWidth: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: '#dbeafe',
                    color: '#0891b2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    4
                  </Box>
                  <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Use "Manual Entry" if the QR code cannot be scanned
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* Manual Entry Dialog */}
      <Dialog 
        open={manualEntryOpen} 
        onClose={() => {
          setManualEntryOpen(false);
          setQrCode('');
          setError('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Manual Entry
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', mb: 3 }}>
            Enter the QR code manually if scanning is not working
          </Typography>
          <TextField
            fullWidth
            label="QR Code"
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            placeholder="QR-1234567890-ABCDEF"
            error={!!error}
            helperText={error}
            autoFocus
            sx={{ fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => {
              setManualEntryOpen(false);
              setQrCode('');
              setError('');
            }}
            sx={{ textTransform: 'none', color: '#6b7280' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleManualEntry}
            variant="contained"
            sx={{ 
              bgcolor: '#0891b2',
              textTransform: 'none',
              '&:hover': { bgcolor: '#0e7490' }
            }}
          >
            Check In
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Notifications */}
      <Snackbar 
        open={!!success} 
        autoHideDuration={3000} 
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSuccess('')} 
          severity="success" 
          sx={{ width: '100%' }}
          icon={<CheckCircleIcon />}
        >
          {success}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!error} 
        autoHideDuration={4000} 
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setError('')} 
          severity="error" 
          sx={{ width: '100%' }}
          icon={<ErrorIcon />}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default QRScanner;