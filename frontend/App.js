
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const App = () => {
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: '', url: '' });
  const [authToken, setAuthToken] = useState(localStorage.getItem('token') || '');
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  useEffect(() => {
    if (authToken) fetchServices();
  }, [authToken]);

  const fetchServices = async () => {
    try {
      const response = await axios.get('/api/services', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const addService = async () => {
    try {
      const response = await axios.post('/api/services', newService, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setServices([...services, response.data]);
      setNewService({ name: '', url: '' });
    } catch (error) {
      console.error('Error adding service:', error);
    }
  };

  const deleteService = async (id) => {
    try {
      await axios.delete(`/api/services/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setServices(services.filter(service => service._id !== id));
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const login = async () => {
    try {
      const response = await axios.post('/api/login', credentials);
      setAuthToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      setCredentials({ username: '', password: '' });
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  return (
    <div className="App">
      <h1>Service Status Tracker</h1>
      {!authToken ? (
        <div>
          <input
            type="text"
            placeholder="Username"
            value={credentials.username}
            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
          />
          <button onClick={login}>Login</button>
        </div>
      ) : (
        <div>
          <div>
            <input
              type="text"
              placeholder="Service Name"
              value={newService.name}
              onChange={(e) => setNewService({ ...newService, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Service URL"
              value={newService.url}
              onChange={(e) => setNewService({ ...newService, url: e.target.value })}
            />
            <button onClick={addService}>Add Service</button>
          </div>
          <ul>
            {services.map((service) => (
              <li key={service._id}>
                <span>{service.name} - {service.status}</span>
                <button onClick={() => deleteService(service._id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default App;
