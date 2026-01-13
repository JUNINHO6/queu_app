import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ClientQueue from './pages/ClientQueue';
import TicketView from './pages/TicketView';
import QueueDetails from './pages/QueueDetails';
import ReservationPage from './pages/ReservationPage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/queue/:queueId/details" 
            element={
              <ProtectedRoute>
                <QueueDetails />
              </ProtectedRoute>
            } 
          />
          <Route path="/q/:queueId" element={<ClientQueue />} />
          <Route path="/q/:queueId/reserve" element={<ReservationPage />} />
          <Route path="/ticket/:ticketId" element={<TicketView />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;