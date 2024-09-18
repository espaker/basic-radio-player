import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button, Card, Flex, Layout, Menu, Slider, Typography } from 'antd';

import { radios } from './data/radios';

import './App.css';
import { MutedOutlined, PauseCircleOutlined, PlayCircleOutlined, SoundOutlined } from '@ant-design/icons';
import { calculateBarData, draw } from './utils';

// interface configProps {
//   radios: {label: string, value: string}[];
//   volume: number;
//   curURL: string;
//   muted: boolean;
// }

function App() {
  // const [config, setConfig] = useState<configProps>({
  //   radios: radios,
  //   volume: 100,
  //   curURL: radios[0].value,
  //   muted: false
  // });
  const [curURL, setCurURL] = useState(localStorage.getItem('lastRadio') || radios[0].value);
  const [volume, setVolume] = useState(parseInt(localStorage.getItem('volume') || '100') || 100);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(!volume);
  const [analyser, setAnalyser] = useState<AnalyserNode>();
  // const [context, setContext] = useState<AudioContext>();
  // const [audioSource, setAudioSource] = useState<MediaElementAudioSourceNode>();
  const audio = useMemo(() => new Audio(), []);  
  const playerRef = useRef<HTMLAudioElement>(audio);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  
  const play = useCallback(() => {
    playerRef.current?.play();
  }, []);

  const updateSrc = useCallback((url: string) => {
    // console.log('updateSrc', url);
    playerRef.current.src = url;
    playerRef.current?.load();
    playerRef.current?.play();
  }, []);

  const handlePlayPause = useCallback(() => {
    if (playing) playerRef.current?.pause();
    else playerRef.current?.play();
  }, [playing]);  

  const handleMute = useCallback(() => {
    setMuted(prev => !prev);
  }, []);

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
    audio.crossOrigin = 'anonymous';
    audio.addEventListener('loadstart', () => setLoading(true));
    audio.addEventListener('loadeddata', () => setLoading(false));
    audio.addEventListener('play', () => {
      const ctx = new AudioContext();
      const analyserNode = ctx.createAnalyser();
      setAnalyser(analyserNode);

      analyserNode.fftSize = 1024;
      analyserNode.minDecibels = -90;
      analyserNode.maxDecibels = -10;
      analyserNode.smoothingTimeConstant = 0.4;

      const source = ctx.createMediaElementSource(audio);

      source
        .connect(analyserNode)
        .connect(ctx.destination)
        
      // setContext(ctx);
      // setAudioSource(source);
      setPlaying(true)
    });
    audio.addEventListener('pause', () => setPlaying(false));

  }, [audio]);


  const report = useCallback(() => {
    if (!analyser) return;

    const data = new Uint8Array(analyser?.frequencyBinCount);

    analyser?.getByteFrequencyData(data);
    processFrequencyData(data);
    requestAnimationFrame(report);
  }, [analyser]);

  const processFrequencyData = (data: Uint8Array): void => {
    if (!canvasRef.current) return;

    const dataPoints = calculateBarData(
      data,
      canvasRef.current.width,
      5,
      1
    );
    draw(
      dataPoints,
      canvasRef.current,
      5,
      1,
      'transparent',
      "rgb(160, 198, 255)"
    );
  };


  useEffect(() => {
    if (!analyser) return;

    report();
  }, [analyser, report]);

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
          <canvas ref={canvasRef} width="1000%" height="65%" style={{ position: 'absolute', zIndex: 1, aspectRatio: "unset" }} />
            <Button 
              icon={(playing) ? <PauseCircleOutlined style={{ fontSize: '400%' }} /> : <PlayCircleOutlined style={{ fontSize: '400%'}} />} 
              onClick={handlePlayPause} 
              danger={playing}
              loading={loading} 
              shape='circle'
              type='text'
              size='large'
              style={{
                minHeight: '70px', 
                minWidth: '70px',
                position: 'relative', zIndex: 2
              }}
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