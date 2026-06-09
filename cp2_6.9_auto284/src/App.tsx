import { useState, useEffect, useCallback, useRef } from 'react';
import type { Plant, CareResponse, CareType } from './types';
import PlantCard from './components/PlantCard';
import CareModal from './components/CareModal';
import Leaderboard from './components/Leaderboard';

function App() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [plantName, setPlantName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [bloomingPlantId, setBloomingPlantId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPlants = useCallback(async () => {
    try {
      const res = await fetch('/api/plants');
      const data = await res.json();
      setPlants(data);
    } catch (err) {
      console.error('获取植物列表失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchPlants();
  }, [fetchPlants]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('仅支持 JPG 和 PNG 格式的图片');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPlant = async () => {
    if (!plantName.trim() || !imageUrl) {
      alert('请输入植物名称并选择图片');
      return;
    }

    if (plantName.length > 10) {
      alert('植物名称不能超过10个字');
      return;
    }

    setIsUploading(true);
    try {
      const res = await fetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: plantName, imageUrl })
      });

      if (res.ok) {
        setPlantName('');
        setImageUrl('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        await fetchPlants();
      } else {
        const data = await res.json();
        alert(data.error || '上传失败');
      }
    } catch (err) {
      console.error('上传植物失败:', err);
      alert('上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCare = async (plantId: string, type: CareType) => {
    try {
      const res = await fetch(`/api/plants/${plantId}/care`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      const data: CareResponse = await res.json();
      if (res.ok) {
        setPlants((prev) =>
          prev.map((p) => (p.id === plantId ? data.plant : p))
        );
        if (data.bloomed) {
          setBloomingPlantId(plantId);
          setTimeout(() => setBloomingPlantId(null), 1500);
        }
      }
    } catch (err) {
      console.error('养护失败:', err);
    }
  };

  const handleCardClick = (plant: Plant) => {
    setSelectedPlant(plant);
    setShowModal(true);
  };

  const handleModalCare = async (type: CareType) => {
    if (!selectedPlant) return;
    await handleCare(selectedPlant.id, type);
    setShowModal(false);
    setSelectedPlant(null);
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">云植乐园</h1>
        <button
          className="rank-btn"
          onClick={() => setShowLeaderboard(true)}
          title="成长排行榜"
        >
          🏆
        </button>
      </div>

      <div className="upload-section">
        <input
          type="text"
          className="name-input"
          placeholder="输入植物名称（最多10字）"
          value={plantName}
          onChange={(e) => setPlantName(e.target.value)}
          maxLength={10}
        />
        <div className="file-input-wrapper">
          <label className="file-label">
            {imageUrl ? '✓ 已选图片' : '选择图片'}
            <input
              ref={fileInputRef}
              type="file"
              className="file-input"
              accept="image/jpeg,image/png"
              onChange={handleImageUpload}
            />
          </label>
        </div>
        <button
          className="upload-btn"
          onClick={handleUploadPlant}
          disabled={isUploading || !plantName.trim() || !imageUrl}
        >
          {isUploading ? '上传中...' : '上传植物'}
        </button>
      </div>

      {plants.length === 0 ? (
        <div className="empty-state">
          还没有植物，快上传你的第一株植物吧！🌱
        </div>
      ) : (
        <div className="plants-grid">
          {plants.slice(0, 100).map((plant, index) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              index={index}
              onClick={() => handleCardClick(plant)}
              isBlooming={bloomingPlantId === plant.id}
            />
          ))}
        </div>
      )}

      {showModal && selectedPlant && (
        <CareModal
          plant={selectedPlant}
          onClose={() => {
            setShowModal(false);
            setSelectedPlant(null);
          }}
          onCare={handleModalCare}
        />
      )}

      {showLeaderboard && (
        <Leaderboard
          plants={plants}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  );
}

export default App;
