import { useState } from 'react'
import reactLogo from './assets/react.svg'
import Sunlight from './assets/Images/Sunlight.jpg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  return (
    
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <img src={Sunlight} alt="Sunlight"/>
      {/* Title with subtext */}
      <h1 style={{ marginBottom: "5px" }}>Bright Future</h1>
      <p style={{ marginTop: 0, color: "gray", fontSize: "14px" }}>
        Helping you plan your outdoor activities with confidence using NASA's weather data to predict the best times for clear skies
      </p>

      {/* First textbox */}
      <input
        type="text"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="Location (City, Country)"
        style={{
          padding: "8px",
          marginRight: "10px",
          marginBottom: "10px",
          fontSize: "16px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      />

      {/* Second textbox */}
      <input
        type="text"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Date (MM/DD)"
        style={{
          padding: "8px",
          fontSize: "16px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      />

      <p>
        The NASA weather data base will be searched for: <b>{firstName} on {lastName}</b>
      </p>
    </div>
  );

  return (
    <>
      <h1>Welcome to Bright Future</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div> 
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
    
  )


  
  
}



export default App;
