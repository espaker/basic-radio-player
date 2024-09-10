import { useState, useRef, useEffect } from 'react';
import { radios } from './data/radios';

function App() {
  const [curURL, setCurURL] = useState(localStorage.getItem('lastRadio') || radios[0].url);
  const playerRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    localStorage.setItem('lastRadio', curURL);
    playerRef.current?.load();
  }, [curURL]);

  return (
    <div className='App'>
      <div>
        <span>Estação: </span>
        <select value={curURL} onChange={(e) => setCurURL(e.target.value)}>
          {radios.map((radio, key) => (
            <option key={key} value={radio.url}>
              {radio.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <audio ref={playerRef} controls autoPlay>
          <source src={curURL} type="audio/ogg; codecs=opus" />
          Seu navegador não suporta o elemento de áudio.
        </audio>
      </div>
    </div>
  );
}

export default App;