import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import api from '../services/api';
import { useSocketEvent } from '../hooks/useSocketEvent';

function LiveQA({ eventId, isOrganizer = false }) {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [answerDialog, setAnswerDialog] = useState({ open: false, question: null, answer: '' });
  const [filter, setFilter] = useState('all'); // all, pending, answered

  useEffect(() => {
    fetchQuestions();
  }, [eventId, filter]);

  // Listen for real-time question updates
  useSocketEvent('question-new', (question) => {
    setQuestions(prev => {
      if (prev.some(q => q.question_id === question.question_id)) {
        return prev;
      }
      return [question, ...prev];
    });
  });

  useSocketEvent('question-update', (updatedQuestion) => {
    setQuestions(prev => prev.map(q => 
      q.question_id === updatedQuestion.question_id ? updatedQuestion : q
    ));
  });

  const fetchQuestions = async () => {
    try {
      const response = await api.get(`/questions/event/${eventId}?status=${filter}`);
      setQuestions(response.data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    try {
      await api.post(`/questions/event/${eventId}`, {
        questionText: newQuestion.trim()
      });
      
      // Don't add to state here - let Socket.IO handle it
      setNewQuestion('');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to submit question');
    }
  };

  const handleAnswerQuestion = async () => {
    if (!answerDialog.answer.trim()) return;

    try {
      await api.patch(`/questions/${answerDialog.question.question_id}/answer`, {
        answerText: answerDialog.answer.trim()
      });
      
      fetchQuestions();
      setAnswerDialog({ open: false, question: null, answer: '' });
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to answer question');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (question) => {
    if (question.is_answered) return 'success';
    return 'warning';
  };

  const getStatusText = (question) => {
    if (question.is_answered) return 'Answered';
    return 'Pending';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Q&A Session
        </Typography>
        
        {isOrganizer && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {['answered', 'pending', 'all'].map((filterOption) => (
              <Button
                key={filterOption}
                size="small"
                variant={filter === filterOption ? 'contained' : 'outlined'}
                onClick={() => setFilter(filterOption)}
                sx={{ textTransform: 'capitalize' }}
              >
                {filterOption}
              </Button>
            ))}
          </Box>
        )}
      </Box>

      {/* Submit Question Form */}
      {!isOrganizer && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <form onSubmit={handleSubmitQuestion}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Ask your question here..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!newQuestion.trim()}
              sx={{ 
                bgcolor: '#0891b2',
                textTransform: 'none',
                '&:hover': { bgcolor: '#0e7490' }
              }}
            >
              Submit Question
            </Button>
          </form>
        </Paper>
      )}

      {/* Questions List */}
      <Box>
        {questions.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <QuestionAnswerIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
            <Typography sx={{ color: '#9ca3af' }}>
              No questions yet. Be the first to ask!
            </Typography>
          </Paper>
        ) : (
          questions.map((question) => (
            <Accordion key={question.question_id} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      {question.question_text}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      by {question.asker_name} • {formatTime(question.created_at)}
                    </Typography>
                  </Box>
                  
                  <Chip 
                    label={getStatusText(question)}
                    color={getStatusColor(question)}
                    size="small"
                  />
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                {question.is_answered ? (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Answer:
                    </Typography>
                    <Typography sx={{ mb: 2 }}>
                      {question.answer_text}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      Answered by {question.answerer_name} • {formatTime(question.answered_at)}
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {isOrganizer ? (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => setAnswerDialog({ 
                          open: true, 
                          question, 
                          answer: '' 
                        })}
                        sx={{ 
                          bgcolor: '#0891b2',
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#0e7490' }
                        }}
                      >
                        Answer Question
                      </Button>
                    ) : (
                      <Typography sx={{ color: '#6b7280', fontStyle: 'italic' }}>
                        Waiting for answer...
                      </Typography>
                    )}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>

      {/* Answer Dialog */}
      <Dialog 
        open={answerDialog.open} 
        onClose={() => setAnswerDialog({ open: false, question: null, answer: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Answer Question
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Question:
          </Typography>
          <Typography sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
            {answerDialog.question?.question_text}
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Your Answer"
            value={answerDialog.answer}
            onChange={(e) => setAnswerDialog(prev => ({ ...prev, answer: e.target.value }))}
            placeholder="Provide a detailed answer..."
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setAnswerDialog({ open: false, question: null, answer: '' })}>
            Cancel
          </Button>
          <Button 
            onClick={handleAnswerQuestion}
            variant="contained"
            disabled={!answerDialog.answer.trim()}
            sx={{ bgcolor: '#0891b2', '&:hover': { bgcolor: '#0e7490' } }}
          >
            Submit Answer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default LiveQA;