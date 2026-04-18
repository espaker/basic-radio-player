import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { theme as antTheme } from 'antd';
import {
  Button, Card, Flex, Layout, Menu, Slider, Typography,
  Input, Select, Spin, Tag, Avatar, Empty, Tooltip, Segmented,
} from 'antd';
import {
  MutedOutlined, PauseCircleOutlined, PlayCircleOutlined,
  SoundOutlined, SearchOutlined, GlobalOutlined,
  HeartOutlined, HeartFilled,
} from '@ant-design/icons';

import {
  fetchTopStations, searchStations, fetchByCountry, fetchCountries,
  fetchStationByUrl, stationToRadio, type RadioStation,
} from './services/radioBrowser';
import { calculateBarData, draw } from './utils';
import './App.css';

type Radio = ReturnType<typeof stationToRadio>;

// Países mais comuns para o select — carregados dinamicamente depois
const QUICK_COUNTRIES = [
  { label: '🌍 Top Global', value: '' },
  { label: '🇧🇷 Brazil', value: 'BR' },
  { label: '🇺🇸 USA', value: 'US' },
  { label: '🇬🇧 UK', value: 'GB' },
  { label: '🇩🇪 Germany', value: 'DE' },
  { label: '🇯🇵 Japan', value: 'JP' },
];

function App() {
  const { token } = antTheme.useToken();

  const [curURL, setCurURL]   = useState(localStorage.getItem('lastRadio') || '');
  const [volume, setVolume]   = useState(parseInt(localStorage.getItem('volume') || '100') || 100);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted]     = useState(!volume);
  const [analyser, setAnalyser] = useState<AnalyserNode>();

  const [radios, setRadios]           = useState<Radio[]>([]);
  const [apiLoading, setApiLoading]   = useState(true);
  const [search, setSearch]           = useState('');
  const [country, setCountry]         = useState('');
  const [countries, setCountries]     = useState(QUICK_COUNTRIES);
  const [curStation, setCurStation]   = useState<Radio | null>(() => {
    try {
      const stored = localStorage.getItem('lastStation');
      return stored ? JSON.parse(stored) as Radio : null;
    } catch { return null; }
  });

  const [favorites, setFavorites] = useState<Map<string, Radio>>(() => {
    try {
      const stored = localStorage.getItem('favorites');
      if (!stored) return new Map();
      const arr = JSON.parse(stored) as Radio[];
      return new Map(arr.map(r => [r.value, r]));
    } catch {
      return new Map();
    }
  });
  const [showFavorites, setShowFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('favorites');
      if (!stored) return false;
      const arr = JSON.parse(stored) as Radio[];
      return arr.length > 0;
    } catch { return false; }
  });

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const audio        = useMemo(() => new Audio(), []);
  const playerRef    = useRef<HTMLAudioElement>(audio);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);

  // ── Carrega lista inicial ────────────────────────────────────────────────
  useEffect(() => {
    loadStations();
    loadCountries();
  }, []);

  async function loadStations(q = '', cc = '') {
    setApiLoading(true);
    try {
      let stations: RadioStation[];
      if (q.trim()) {
        stations = await searchStations(q.trim());
      } else if (cc) {
        stations = await fetchByCountry(cc);
      } else {
        stations = await fetchTopStations(100);
      }
      const mapped = stations.map(stationToRadio).filter(r => r.value);
      setRadios(mapped);

      // Seleciona a primeira se não houver rádio ativa
      if (!curURL && mapped.length > 0) {
        setCurURL(mapped[0].value);
        setCurStation(mapped[0]);
        localStorage.setItem('lastStation', JSON.stringify(mapped[0]));
      } else if (curURL) {
        // Restaura curStation com dados frescos da lista (fix F5)
        const match = mapped.find(r => r.value === curURL);
        if (match) {
          setCurStation(match);
          localStorage.setItem('lastStation', JSON.stringify(match));
        } else {
          // Estação não está no top 100 — busca diretamente por URL
          fetchStationByUrl(curURL).then(station => {
            if (station) {
              const radio = stationToRadio(station);
              setCurStation(radio);
              localStorage.setItem('lastStation', JSON.stringify(radio));
            }
          });
        }
      }
    } catch (e) {
      console.error('Radio Browser API error:', e);
    } finally {
      setApiLoading(false);
    }
  }

  async function loadCountries() {
    try {
      const data = await fetchCountries();
      const sorted = data
        .sort((a, b) => b.stationcount - a.stationcount)
        .slice(0, 80)
        .map(c => ({ label: `${c.name}`, value: c.iso_3166_1 }));
      setCountries([{ label: '🌍 Top Global', value: '' }, ...sorted]);
    } catch {
      // mantém os quick countries
    }
  }

  // ── Busca com debounce ───────────────────────────────────────────────────
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      loadStations(value, country);
    }, 500);
  }, [country]);

  const handleCountry = useCallback((value: string) => {
    setCountry(value);
    loadStations(search, value);
  }, [search]);

  // ── Player ───────────────────────────────────────────────────────────────
  const updateSrc = useCallback((url: string) => {
    playerRef.current.src = url;
    playerRef.current.load();
    playerRef.current.play().catch(() => {});
  }, []);

  const handlePlayPause = useCallback(() => {
    if (playing) playerRef.current?.pause();
    else playerRef.current?.play().catch(() => {});
  }, [playing]);

  const handleMute = useCallback(() => setMuted(prev => !prev), []);

  const handleSelectStation = useCallback((radio: Radio) => {
    setCurURL(radio.value);
    setCurStation(radio);
    localStorage.setItem('lastStation', JSON.stringify(radio));
  }, []);

  const toggleFavorite = useCallback((radio: Radio, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Map(prev);
      if (next.has(radio.value)) next.delete(radio.value);
      else next.set(radio.value, radio);
      localStorage.setItem('favorites', JSON.stringify([...next.values()]));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!curURL) return;
    localStorage.setItem('lastRadio', curURL);
    updateSrc(curURL);
  }, [curURL, updateSrc]);

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
      // Cria AudioContext e source node uma única vez (fix Chromium)
      if (!audioCtxRef.current) {
        const ctx = new AudioContext();
        const analyserNode = ctx.createAnalyser();

        analyserNode.fftSize = 1024;
        analyserNode.minDecibels = -90;
        analyserNode.maxDecibels = -10;
        analyserNode.smoothingTimeConstant = 0.4;

        const source = ctx.createMediaElementSource(audio);
        source.connect(analyserNode).connect(ctx.destination);

        audioCtxRef.current = ctx;
        analyserNodeRef.current = analyserNode;
        setAnalyser(analyserNode);
      }

      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      setPlaying(true);
    });

    audio.addEventListener('pause', () => setPlaying(false));
  }, [audio]);

  // ── Visualizador ─────────────────────────────────────────────────────────
  const report = useCallback(() => {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    if (canvasRef.current) {
      const dataPoints = calculateBarData(data, canvasRef.current.width, 5, 1);
      draw(dataPoints, canvasRef.current, 5, 1, 'transparent', 'rgb(160, 198, 255)');
    }

    requestAnimationFrame(report);
  }, [analyser]);

  useEffect(() => {
    if (!analyser) return;
    report();
  }, [analyser, report]);

  const displayedRadios = showFavorites ? [...favorites.values()] : radios;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Card
        title={
          <Flex justify='center'>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Simple Radio Player
            </Typography.Title>
          </Flex>
        }
        style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, overflow: 'hidden', padding: '12px 24px' } }}
      >
        <Flex vertical className='flexbody' gap={12}>

          {/* Visualizador + botão play */}
          <Flex justify='center' style={{ position: 'relative', height: 70 }}>
            <canvas
              ref={canvasRef}
              width="1000"
              height="70"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            />
            <Button
              icon={playing
                ? <PauseCircleOutlined style={{ fontSize: '400%' }} />
                : <PlayCircleOutlined style={{ fontSize: '400%' }} />}
              onClick={handlePlayPause}
              danger={playing}
              loading={loading}
              shape='circle'
              type='text'
              size='large'
              style={{ minHeight: 70, minWidth: 70, position: 'relative', zIndex: 2 }}
            />
          </Flex>

          {/* Current station — always visible to avoid layout shift */}
          <Flex justify='center' align='center' gap={8} style={{ minHeight: 28 }}>
            {curStation ? (
              <>
                {curStation.favicon && (
                  <Avatar src={curStation.favicon} size={20} shape='square' />
                )}
                <Typography.Text type='secondary' ellipsis style={{ maxWidth: 300 }}>
                  {curStation.label}
                </Typography.Text>
                {curStation.bitrate > 0 && (
                  <Tag style={{ fontSize: 10 }}>{curStation.bitrate}kbps {curStation.codec}</Tag>
                )}
              </>
            ) : null}
          </Flex>

          {/* Volume */}
          <Flex gap={8} justify='center' align='center'>
            <Button
              icon={volume && !muted ? <SoundOutlined /> : <MutedOutlined />}
              onClick={handleMute}
              danger={muted}
            />
            <Slider
              style={{ width: '70vw' }}
              min={0} max={100}
              value={volume}
              onChange={setVolume}
            />
          </Flex>

          {/* Busca + filtro de país */}
          <Flex gap={8} style={{ padding: '0 8px' }}>
            <Input
              placeholder='Search station...'
              prefix={<SearchOutlined />}
              value={search}
              onChange={e => handleSearch(e.target.value)}
              allowClear
              style={{ flex: 1 }}
            />
            <Select
              value={country}
              onChange={handleCountry}
              options={countries}
              style={{ width: 160 }}
              suffixIcon={<GlobalOutlined />}
              showSearch
              optionFilterProp='label'
            />
          </Flex>

          {/* Toggle Favoritos */}
          <Segmented
            options={[
              { label: 'All', value: 'all' },
              { label: `Favorites (${favorites.size})`, value: 'favorites' },
            ]}
            value={showFavorites ? 'favorites' : 'all'}
            onChange={v => setShowFavorites(v === 'favorites')}
            style={{ alignSelf: 'center' }}
          />

          {/* Lista de rádios */}
          {apiLoading && !showFavorites ? (
            <Flex justify='center' style={{ padding: 32 }}>
              <Spin tip='Loading stations...' />
            </Flex>
          ) : displayedRadios.length === 0 ? (
            <Empty description={showFavorites ? 'No favorites yet' : 'No stations found'} />
          ) : (
            <Menu
              onClick={({ key }) => {
                const radio = displayedRadios.find(r => r.value === key);
                if (radio) handleSelectStation(radio);
              }}
              mode='inline'
              selectedKeys={[curURL]}
              style={{ overflowY: 'auto', maxHeight: '55vh' }}
              items={displayedRadios.map(radio => ({
                key: radio.value,
                icon: radio.favicon
                  ? <Avatar src={radio.favicon} size={16} shape='square' />
                  : undefined,
                label: (
                  <Flex justify='space-between' align='center'>
                    <Typography.Text ellipsis style={{ maxWidth: 200 }}>
                      {radio.label}
                    </Typography.Text>
                    <Flex align='center' gap={4}>
                      {radio.country && (
                        <Typography.Text type='secondary' style={{ fontSize: 11 }}>
                          {radio.country}
                        </Typography.Text>
                      )}
                      <Tooltip title={favorites.has(radio.value) ? 'Remove from favorites' : 'Add to favorites'}>
                        <Button
                          type='text'
                          size='small'
                          icon={favorites.has(radio.value)
                            ? <HeartFilled style={{ color: '#ff4d4f' }} />
                            : <HeartOutlined />}
                          onClick={e => toggleFavorite(radio, e)}
                        />
                      </Tooltip>
                    </Flex>
                  </Flex>
                ),
              }))}
            />
          )}

          {/* espaço para o footer fixed não cobrir conteúdo */}
          <div style={{ height: 36 }} />

        </Flex>
      </Card>

      {/* Footer fixed */}
      <Flex
        justify='center'
        align='center'
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 36,
          background: token.colorBgContainer,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          zIndex: 100,
        }}
      >
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          Made by{' '}
          <Typography.Link href='https://github.com/espaker/' target='_blank' rel='noopener noreferrer'>
            Espaker
          </Typography.Link>
          {' · '}
          <Typography.Link href='https://github.com/espaker/basic-radio-player' target='_blank' rel='noopener noreferrer'>
            Project GitHub
          </Typography.Link>
        </Typography.Text>
      </Flex>
    </Layout>
  );
}

export default App;