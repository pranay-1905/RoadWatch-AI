import React from 'react';
import { Zap, CloudRain } from 'lucide-react';

export default function IncidentFeed({ data, onSelectPothole }) {
  return (
    <div className="feed-column">
      <div className="card feed-card">
        <div className="card-header">
          <div className="card-title">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Real-Time Pothole Stream</span>
          </div>
          <span className="pulse-badge"><span className="pulse-dot"></span> LIVE 4G</span>
        </div>
        
        <div className="feed-list">
          {Array.isArray(data) && data.map(item => {
            const severity = String(item.severity || 'MEDIUM');
            const statusText = item.status === 'PENDING' ? 'Pending' : (item.status === 'TENDER_ISSUED' ? 'Tender Sent' : 'Work Done');
            const timestamp = item.timestamp || item.reportedAt || item.created_at || '';
            const timeText = timestamp.includes(' ') ? timestamp.split(' ')[1] : timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
            const location = item.locationName || item.location || item.ward || item.roadName || 'Location pending';
            return (
              <div
                key={item.id}
                className={`feed-item ${severity.toLowerCase()}`}
                onClick={() => onSelectPothole(item)}
              >
                <img src={item.imgUrl || item.image || '/road-placeholder.svg'} className="feed-thumb" alt="Pothole Snapshot" />
                <div className="feed-info">
                  <div className="feed-header">
                    <h5>{item.id} - {severity}</h5>
                    <span className="time">{timeText}</span>
                  </div>
                  <p>{location}</p>
                  <small style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                    Status: <strong>{statusText}</strong> | IMU Shock: {item.imuGForce ?? '--'}G
                  </small>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weather Risk Card */}
      <div className="card weather-card">
        <div className="weather-content">
          <div className="weather-icon">
            <CloudRain className="w-8 h-8 text-white" />
          </div>
          <div className="weather-text">
            <h4>Monsoon Risk Rating: HIGH</h4>
            <p>Heavy rainfall recorded in Nagpur Zone 4 (42mm). High risk of pothole enlargement!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
