import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button, Flex, Layout, Select, Slider } from 'antd';

import { radios } from './data/radios';

import './App.css';
import { MutedOutlined, PauseCircleFilled, PlayCircleOutlined, SoundOutlined } from '@ant-design/icons';

function App() {
  const [curURL, setCurURL] = useState(localStorage.getItem('lastRadio') || radios[0].value);
  const [volume, setVolume] = useState(parseInt(localStorage.getItem('volume') || '100') || 100);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(!volume);
  const audio = useMemo(() => new Audio(), []);
  const playerRef = useRef<HTMLAudioElement>(audio);

  
  const play = useCallback(() => {
    playerRef.current?.play();
  }, []);

  const updateSrc = useCallback((url: string) => {
    audio.src = url;
    playerRef.current?.load();
    playerRef.current?.play();
  }, [audio]);
  
  const handlePlayPause = useCallback(() => {
    if (playing) playerRef.current?.pause();
    else playerRef.current?.play();
  }, [playing]);  

  const handleMute = useCallback(() => {
    setMuted(!muted);
  }, [muted]);

  useEffect(() => {
    localStorage.setItem('lastRadio', curURL);
    updateSrc(curURL);
  }, [curURL, updateSrc, play]);

  useEffect(() => {
    localStorage.setItem('volume', volume.toString());
    playerRef.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    playerRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    audio.addEventListener('loadstart', () => setLoading(true));
    audio.addEventListener('loadeddata', () => setLoading(false));
    audio.addEventListener('play', () => setPlaying(true));
    audio.addEventListener('pause', () => setPlaying(false));
  }, [audio]);

  return (
    <Layout>
      <Flex vertical style={{width: "100%", height: "100%"}}>
        <Flex gap={5}>
          <Button 
            icon={(playing) ? <PauseCircleFilled /> : <PlayCircleOutlined />} 
            onClick={handlePlayPause} 
            loading={loading} 
          />
          <Select 
            placeholder='Selecione uma estação'
            showSearch
            optionFilterProp='label'
            style={{width: '80vw'}} 
            value={curURL} 
            onChange={(e) => setCurURL(e)} 
            options={radios}
          />
          <Button 
            icon={volume && !muted ? <SoundOutlined /> : <MutedOutlined />}
            onClick={handleMute} 
          />
          <Slider 
            style={{width: '15vw'}} 
            min={0} max={100}  
            value={volume} 
            onChange={setVolume} 
          />
        </Flex>
      </Flex>
    </Layout>
  );
}

export default App;