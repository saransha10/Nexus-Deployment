import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PollIcon from '@mui/icons-material/Poll';
import CloseIcon from '@mui/icons-material/Close';
import api from '../services/api';
import { useSocketEvent } from '../hooks/useSocketEvent';

function LivePolls({ eventId, isOrganizer = false }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPoll, setNewPoll] = useState({
    question: '',
    options: ['', '']
  });
  const [userVotes, setUserVotes] = useState({}); // Track user votes

  useEffect(() => {
    fetchPolls();
  }, [eventId]);

  // Listen for real-time poll updates
  useSocketEvent('poll-update', (pollData) => {
    fetchPolls(); // Refresh polls when someone votes
  });

  const fetchPolls = async () => {
    try {
      const response = await api.get(`/polls/event/${eventId}`);
      setPolls(response.data);
    } catch (error) {
      console.error('Failed to fetch polls:', error);
    }
  };

  const handleCreatePoll = async () => {
    if (!newPoll.question.trim() || newPoll.options.filter(opt => opt.trim()).length < 2) {
      alert('Please provide a question and at least 2 options');
      return;
    }

    try {
      const response = await api.post(`/polls/event/${eventId}`, {
        question: newPoll.question.trim(),
        options: newPoll.options.filter(opt => opt.trim())
      });

      setPolls(prev => [response.data, ...prev]);
      setCreateDialogOpen(false);
      setNewPoll({ question: '', options: ['', ''] });
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create poll');
    }
  };

  const handleVote = async (pollId, optionId) => {
    try {
      await api.post(`/polls/${pollId}/vote`, { optionId });
      setUserVotes(prev => ({ ...prev, [pollId]: optionId }));
      fetchPolls(); // Refresh to get updated vote counts
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to vote');
    }
  };

  const handleTogglePoll = async (pollId, currentStatus) => {
    try {
      await api.patch(`/polls/${pollId}/toggle`);
      setPolls(prev => prev.map(poll => 
        poll.poll_id === pollId 
          ? { ...poll, is_active: !currentStatus }
          : poll
      ));
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update poll');
    }
  };

  const addOption = () => {
    if (newPoll.options.length < 6) {
      setNewPoll(prev => ({
        ...prev,
        options: [...prev.options, '']
      }));
    }
  };

  const removeOption = (index) => {
    if (newPoll.options.length > 2) {
      setNewPoll(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const updateOption = (index, value) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const getTotalVotes = (poll) => {
    return poll.options?.reduce((sum, option) => sum + (option.vote_count || 0), 0) || 0;
  };

  const getPercentage = (voteCount, totalVotes) => {
    return totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Live Polls
        </Typography>
        {isOrganizer && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ 
              bgcolor: '#0891b2',
              textTransform: 'none',
              '&:hover': { bgcolor: '#0e7490' }
            }}
          >
            Create Poll
          </Button>
        )}
      </Box>

      {/* Polls List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {polls.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <PollIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
            <Typography sx={{ color: '#9ca3af' }}>
              No polls yet. {isOrganizer ? 'Create the first poll!' : 'Check back later.'}
            </Typography>
          </Paper>
        ) : (
          polls.map((poll) => {
            const totalVotes = getTotalVotes(poll);
            const hasVoted = userVotes[poll.poll_id];
            
            return (
              <Paper key={poll.poll_id} sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                    {poll.question}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip 
                      label={poll.is_active ? 'Active' : 'Closed'}
                      color={poll.is_active ? 'success' : 'default'}
                      size="small"
                    />
                    {isOrganizer && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleTogglePoll(poll.poll_id, poll.is_active)}
                        sx={{ textTransform: 'none' }}
                      >
                        {poll.is_active ? 'Close' : 'Reopen'}
                      </Button>
                    )}
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
                  {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} • Created by {poll.created_by_name}
                </Typography>

                {poll.is_active && !hasVoted ? (
                  // Voting interface
                  <FormControl component="fieldset" fullWidth>
                    <RadioGroup
                      value=""
                      onChange={(e) => handleVote(poll.poll_id, parseInt(e.target.value))}
                    >
                      {poll.options?.map((option) => (
                        <FormControlLabel
                          key={option.option_id}
                          value={option.option_id}
                          control={<Radio />}
                          label={option.option_text}
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                ) : (
                  // Results view
                  <Box>
                    {poll.options?.map((option) => {
                      const percentage = getPercentage(option.vote_count, totalVotes);
                      
                      return (
                        <Box key={option.option_id} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">
                              {option.option_text}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {option.vote_count} ({percentage}%)
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={percentage}
                            sx={{ 
                              height: 8,
                              borderRadius: 4,
                              bgcolor: '#f3f4f6',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: hasVoted === option.option_id ? '#0891b2' : '#d1d5db'
                              }
                            }}
                          />
                        </Box>
                      );
                    })}
                    
                    {hasVoted && (
                      <Typography variant="body2" sx={{ color: '#0891b2', mt: 1 }}>
                        ✓ You voted for this poll
                      </Typography>
                    )}
                  </Box>
                )}
              </Paper>
            );
          })
        )}
      </Box>

      {/* Create Poll Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Create New Poll
            <IconButton onClick={() => setCreateDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <TextField
            fullWidth
            label="Poll Question"
            value={newPoll.question}
            onChange={(e) => setNewPoll(prev => ({ ...prev, question: e.target.value }))}
            margin="normal"
            placeholder="What would you like to ask?"
          />
          
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Options (2-6 options)
          </Typography>
          
          {newPoll.options.map((option, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={`Option ${index + 1}`}
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
              />
              {newPoll.options.length > 2 && (
                <IconButton 
                  size="small"
                  onClick={() => removeOption(index)}
                  sx={{ color: '#dc2626' }}
                >
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
          ))}
          
          {newPoll.options.length < 6 && (
            <Button
              startIcon={<AddIcon />}
              onClick={addOption}
              sx={{ mt: 1, textTransform: 'none' }}
            >
              Add Option
            </Button>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreatePoll}
            variant="contained"
            sx={{ bgcolor: '#0891b2', '&:hover': { bgcolor: '#0e7490' } }}
          >
            Create Poll
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default LivePolls;