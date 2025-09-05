import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Toasts from "../components/Toasts";

const API = import.meta.env.VITE_API_URL || "https://expence-tracker-backend-klge.onrender.com";

export default function LoginPage() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorShake, setErrorShake] = useState(false);
  const [terminalLines, setTerminalLines] = useState([
    "> INITIALIZING SYSTEM...",
    "> CONNECTING TO SERVER...",
    "> AWAITING CREDENTIALS..."
  ]);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    
    // Add login attempt to terminal
    setTerminalLines(prev => [
      ...prev,
      "> ATTEMPTING ACCESS...",
      `> USERNAME: ${form.username}`,
      "> VERIFYING CREDENTIALS..."
    ]);
    
    try {
      const res = await axios.post(API + "/api/login", form);

      localStorage.setItem("user", JSON.stringify(res.data.user));
      
      // Add success messages to terminal
      setTerminalLines(prev => [
        ...prev,
        "> CREDENTIALS ACCEPTED",
        "> ACCESS GRANTED",
        "> WELCOME, DEVELOPER"
      ]);
      
      showToast("Access Granted", "success");
      document.querySelector(".login-card").classList.add("success-glow");
      
      setTimeout(() => navigate("/Dashboard"), 1000);
    } catch (err) {
      console.error(err);
      
      // Add error messages to terminal
      setTerminalLines(prev => [
        ...prev,
        "> ERROR: INVALID CREDENTIALS",
        "> ACCESS DENIED",
        "> PLEASE TRY AGAIN"
      ]);
      
      showToast("Access Denied", "error");
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 600);
    }
    setLoading(false);
  }

  function showToast(message, type) {
    window.dispatchEvent(
      new CustomEvent("toast", { detail: { message, type } })
    );
  }

  useEffect(() => {
    // Setup coding background
    const canvas = document.getElementById("code-bg");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    function resizeCanvas() {
      canvas.height = window.innerHeight;
      canvas.width = window.innerWidth;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Developer-themed words
    const words = [
      "#include", "class", "object", "public", "return", "function", 
      "let", "const", "var", "React", "Node.js", "MongoDB", 
      "Express", "async", "await", "npm", "try", "catch"
    ];

    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    function draw() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#00ccff";
      ctx.font = `${fontSize}px 'Fira Code', monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = words[Math.floor(Math.random() * words.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    const interval = setInterval(draw, 33);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Terminal typing effect
  useEffect(() => {
    const terminal = document.querySelector(".terminal");
    if (terminal) {
      terminal.scrollTop = terminal.scrollHeight;
    }
  }, [terminalLines]);

  return (
    <div className="dev-login-page">
      <Toasts />
      <canvas id="code-bg"></canvas>

      <div className="cyberpunk-container">
        <div className="terminal">
          {terminalLines.map((line, index) => (
            <div key={index} className="terminal-line">
              {line}
            </div>
          ))}
          {loading && <div className="terminal-line blink"> PROCESSING...</div>}
        </div>

        <div className={`login-card ${errorShake ? "shake" : ""}`}>
          <div className="cyberpunk-header">
            <div className="cyberpunk-glitch" data-text="SECURE ACCESS">SECURE ACCESS</div>
            <p className="cyberpunk-subtitle">EXPENSE TRACKER // JESWIN</p>
          </div>

          <form onSubmit={handleLogin} className="cyberpunk-form">
            <div className="input-group cyberpunk-input">
              <label htmlFor="username" className="cyberpunk-label">
                <span className="glitch-text" data-text="USERNAME:">USERNAME:</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="username"
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="ENTER YOUR USERNAME"
                  className="cyberpunk-field"
                />
                <span className="input-highlight"></span>
              </div>
            </div>
            
            <div className="input-group cyberpunk-input">
              <label htmlFor="password" className="cyberpunk-label">
                <span className="glitch-text" data-text="PASSWORD:">PASSWORD:</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="ENTER YOUR PASSWORD"
                  className="cyberpunk-field"
                />
                <span className="input-highlight"></span>
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="cyberpunk-button">
              <span className="cyberpunk-button-text">
                {loading ? "VERIFYING..." : "AUTHENTICATE"}
              </span>
              <span className="cyberpunk-button-glitch"></span>
              <span className="cyberpunk-button-gradient"></span>
            </button>
          </form>
          
          <div className="cyberpunk-footer">
            <p>SECURE DEVELOPER ACCESS PORTAL</p>
            <div className="scanline"></div>
          </div>
        </div>
      </div>

      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Share+Tech+Mono&display=swap');
        
        .dev-login-page {
          position: relative;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          font-family: 'Share Tech Mono', monospace;
          padding: 20px;
          background: #000;
          color: #0f0;
        }

        #code-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .cyberpunk-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          width: 100%;
          max-width: 900px;
          z-index: 2;
        }

        .terminal {
          width: 100%;
          height: 150px;
          background: rgba(0, 20, 0, 0.8);
          border: 1px solid #00ff00;
          padding: 1rem;
          overflow-y: auto;
          font-family: 'Fira Code', monospace;
          font-size: 0.9rem;
          box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
          position: relative;
        }

        .terminal::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(transparent 50%, rgba(0, 255, 0, 0.05) 50%);
          background-size: 100% 4px;
          pointer-events: none;
          z-index: 1;
        }

        .terminal-line {
          margin-bottom: 0.25rem;
          color: #00ff00;
          text-shadow: 0 0 5px #00ff00;
          line-height: 1.4;
        }

        .blink {
          animation: blink 1s steps(2, start) infinite;
        }

        @keyframes blink {
          to { visibility: hidden; }
        }

        .login-card {
          position: relative;
          z-index: 1;
          background: rgba(15, 20, 15, 0.9);
          padding: 2.5rem;
          border-radius: 4px;
          max-width: 440px;
          width: 100%;
          color: #00ff00;
          box-shadow: 0 0 25px rgba(0, 255, 0, 0.3);
          backdrop-filter: blur(5px);
          transition: all 0.4s ease;
          border: 1px solid #00ff00;
          overflow: hidden;
        }

        .login-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 255, 0, 0.1),
            transparent
          );
          transition: 0.5s;
        }

        .login-card:hover::before {
          left: 100%;
        }

        .login-card.success-glow {
          box-shadow: 0 0 30px rgba(0, 255, 150, 0.6);
          border-color: #00ff99;
        }

        .shake {
          animation: shakeAnim 0.5s;
        }
        
        @keyframes shakeAnim {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }

        .cyberpunk-header {
          text-align: center;
          margin-bottom: 2rem;
          position: relative;
        }

        .cyberpunk-glitch {
          font-size: 1.8rem;
          font-weight: bold;
          text-transform: uppercase;
          position: relative;
          color: #00ff00;
          letter-spacing: 2px;
          margin: 0 0 0.5rem 0;
        }

        .cyberpunk-glitch::before,
        .cyberpunk-glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .cyberpunk-glitch::before {
          left: 2px;
          text-shadow: -2px 0 #ff00ff;
          clip: rect(44px, 450px, 56px, 0);
          animation: glitch-anim 5s infinite linear alternate-reverse;
        }

        .cyberpunk-glitch::after {
          left: -2px;
          text-shadow: -2px 0 #00ffff;
          clip: rect(44px, 450px, 56px, 0);
          animation: glitch-anim2 5s infinite linear alternate-reverse;
        }

        @keyframes glitch-anim {
          0% { clip: rect(42px, 9999px, 44px, 0); }
          5% { clip: rect(12px, 9999px, 59px, 0); }
          10% { clip: rect(48px, 9999px, 29px, 0); }
          15% { clip: rect(42px, 9999px, 73px, 0); }
          20% { clip: rect(63px, 9999px, 27px, 0); }
          25% { clip: rect(34px, 9999px, 55px, 0); }
          30% { clip: rect(86px, 9999px, 73px, 0); }
          35% { clip: rect(20px, 9999px, 20px, 0); }
          40% { clip: rect(26px, 9999px, 60px, 0); }
          45% { clip: rect(25px, 9999px, 66px, 0); }
          50% { clip: rect(57px, 9999px, 98px, 0); }
          55% { clip: rect(5px, 9999px, 46px, 0); }
          60% { clip: rect(82px, 9999px, 31px, 0); }
          65% { clip: rect(54px, 9999px, 27px, 0); }
          70% { clip: rect(28px, 9999px, 99px, 0); }
          75% { clip: rect(45px, 9999px, 69px, 0); }
          80% { clip: rect(23px, 9999px, 85px, 0); }
          85% { clip: rect(54px, 9999px, 84px, 0); }
          90% { clip: rect(45px, 9999px, 47px, 0); }
          95% { clip: rect(24px, 9999px, 23px, 0); }
          100% { clip: rect(32px, 9999px, 92px, 0); }
        }

        @keyframes glitch-anim2 {
          0% { clip: rect(65px, 9999px, 100px, 0); }
          5% { clip: rect(52px, 9999px, 74px, 0); }
          10% { clip: rect(79px, 9999px, 85px, 0); }
          15% { clip: rect(75px, 9999px, 5px, 0); }
          20% { clip: rect(67px, 9999px, 61px, 0); }
          25% { clip: rect(14px, 9999px, 79px, 0); }
          30% { clip: rect(1px, 9999px, 66px, 0); }
          35% { clip: rect(86px, 9999px, 30px, 0); }
          40% { clip: rect(23px, 9999px, 98px, 0); }
          45% { clip: rect(85px, 9999px, 72px, 0); }
          50% { clip: rect(71px, 9999px, 75px, 0); }
          55% { clip: rect(2px, 9999px, 48px, 0); }
          60% { clip: rect(30px, 9999px, 16px, 0); }
          65% { clip: rect(59px, 9999px, 50px, 0); }
          70% { clip: rect(41px, 9999px, 62px, 0); }
          75% { clip: rect(2px, 9999px, 82px, 0); }
          80% { clip: rect(47px, 9999px, 73px, 0); }
          85% { clip: rect(3px, 9999px, 27px, 0); }
          90% { clip: rect(26px, 9999px, 55px, 0); }
          95% { clip: rect(42px, 9999px, 97px, 0); }
          100% { clip: rect(38px, 9999px, 49px, 0); }
        }

        .cyberpunk-subtitle {
          font-size: 1rem;
          margin: 0;
          color: #00cc66;
          font-weight: 400;
          letter-spacing: 1px;
        }

        .cyberpunk-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .cyberpunk-input {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .cyberpunk-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: #00ff00;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .glitch-text {
          position: relative;
        }

        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.8;
        }

        .glitch-text::before {
          color: #ff00ff;
          z-index: -1;
          left: 2px;
          animation: glitch-text 2s infinite linear alternate-reverse;
        }

        .glitch-text::after {
          color: #00ffff;
          z-index: -2;
          left: -2px;
          animation: glitch-text 3s infinite linear alternate-reverse;
        }

        @keyframes glitch-text {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }

        .input-wrapper {
          position: relative;
        }

        .cyberpunk-field {
          padding: 0.875rem 1rem;
          border-radius: 2px;
          border: 1px solid #00ff00;
          background: rgba(0, 20, 0, 0.7);
          color: #00ff00;
          font-size: 1rem;
          outline: none;
          transition: all 0.2s ease;
          font-family: 'Share Tech Mono', monospace;
          width: 100%;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .cyberpunk-field:focus {
          border-color: #00ffff;
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
        }

        .cyberpunk-field::placeholder {
          color: #008800;
          text-transform: none;
        }

        .input-highlight {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background: #00ffff;
          box-shadow: 0 0 10px #00ffff;
          transition: width 0.3s ease;
        }

        .cyberpunk-field:focus ~ .input-highlight {
          width: 100%;
        }

        .cyberpunk-button {
          margin-top: 0.5rem;
          padding: 0.875rem 1rem;
          border-radius: 2px;
          border: none;
          background: transparent;
          color: #00ff00;
          font-weight: bold;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s ease;
          font-family: 'Share Tech Mono', monospace;
          text-transform: uppercase;
          letter-spacing: 2px;
          position: relative;
          overflow: hidden;
          z-index: 1;
        }

        .cyberpunk-button-text {
          position: relative;
          z-index: 2;
        }

        .cyberpunk-button-gradient {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, #00ff00, #00ffff, #00ff00);
          background-size: 200% 100%;
          z-index: -1;
          transition: 0.5s;
          opacity: 0;
        }

        .cyberpunk-button:hover .cyberpunk-button-gradient {
          opacity: 1;
          background-position: 100% 0;
          animation: gradientMove 3s infinite linear;
        }

        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        .cyberpunk-button-glitch {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(255, 0, 255, 0.2);
          z-index: -2;
          opacity: 0;
          transition: all 0.3s;
        }

        .cyberpunk-button:hover .cyberpunk-button-glitch {
          opacity: 0.7;
          animation: glitch 0.3s infinite;
        }

        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }

        .cyberpunk-button:hover:not(:disabled) {
          color: #000;
          text-shadow: 0 0 5px #000;
        }

        .cyberpunk-button:active:not(:disabled) {
          transform: translateY(2px);
        }

        .cyberpunk-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .cyberpunk-footer {
          margin-top: 2rem;
          text-align: center;
          border-top: 1px solid #00ff00;
          padding-top: 1.5rem;
          position: relative;
          overflow: hidden;
        }

        .cyberpunk-footer p {
          margin: 0;
          font-size: 0.875rem;
          color: #00cc66;
          letter-spacing: 1px;
        }

        .scanline {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: #00ff00;
          box-shadow: 0 0 10px #00ff00;
          animation: scanline 3s linear infinite;
        }

        @keyframes scanline {
          0% { top: 0; }
          100% { top: 100%; }
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 2rem 1.5rem;
          }
          
          .cyberpunk-glitch {
            font-size: 1.5rem;
          }
          
          .terminal {
            height: 120px;
            font-size: 0.8rem;
          }
        }
      `}
      </style>
    </div>
  );
}