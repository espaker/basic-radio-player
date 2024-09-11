import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button, Card, Flex, Layout, Menu, Slider, Typography } from 'antd';

import { radios } from './data/radios';

import './App.css';
import { MutedOutlined, PauseCircleOutlined, PlayCircleOutlined, SoundOutlined } from '@ant-design/icons';

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
    <Layout >
      <Card 
        title={
          <Flex justify='center'>
            <Typography.Title level={4}>Simple Radio Player</Typography.Title>
          </Flex>
        } 
        style={{minWidth: '100vw', minHeight: '100vh'}}
      >
        <Flex vertical className='flexbody'>
          <Flex justify='center'>
            <Button 
              icon={(playing) ? <PauseCircleOutlined style={{ fontSize: '400%'}} /> : <PlayCircleOutlined style={{ fontSize: '400%'}} />} 
              onClick={handlePlayPause} 
              danger={playing}
              loading={loading} 
              shape='circle'
              type='text'
              size='large'
              style={{minHeight: '70px', minWidth: '70px'}}
            />
          </Flex>
          <Flex gap={5} justify='center'>
            <Button 
              icon={volume && !muted ? <SoundOutlined /> : <MutedOutlined />}
              onClick={handleMute} 
              danger={muted}
            />
            <Slider 
              style={{width: '70vw'}} 
              min={0} max={100}  
              value={volume} 
              onChange={setVolume} 
            />
          </Flex>
          <Flex vertical>
            <Menu
                onClick={({key}) => setCurURL(key)}
                mode='inline' 
                selectedKeys={[curURL]}
                items={radios.map((radio) => ({label: radio.label, key: radio.value}))}
                style={{overflowY: 'auto', maxHeight: '70vh'}}
            />
          </Flex>
        </Flex>
      </Card>
    </Layout>
  );
}

export default App;