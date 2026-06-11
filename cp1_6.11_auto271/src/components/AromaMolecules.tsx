import React from 'react';
import { AromaMolecule } from '../FermentationEngine';

interface AromaMoleculesProps {
  molecules: AromaMolecule[];
}

const AromaMolecules: React.FC<AromaMoleculesProps> = ({ molecules }) => {
  if (molecules.length === 0) {
    return (
      <div className="aroma-section">
        <h3 className="aroma-title">🍃 香气物质</h3>
        <div style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '20px' }}>
          等待发酵，香气分子正在生成中...
        </div>
      </div>
    );
  }

  return (
    <div className="aroma-section">
      <h3 className="aroma-title">🍃 香气物质</h3>
      <div className="aroma-molecules">
        {molecules.map((molecule, index) => (
          <div
            key={molecule.id}
            className="molecule-card"
            style={{
              borderColor: molecule.color,
              animationDelay: `${index * 0.1}s`
            }}
          >
            <div
              className="molecule-symbol"
              style={{ backgroundColor: molecule.color }}
            >
              {molecule.symbol}
            </div>
            <div className="molecule-info">
              <h4 style={{ color: molecule.color }}>{molecule.name}</h4>
              <p>{molecule.description}</p>
              <div className="molecule-intensity">
                <div
                  className="molecule-intensity-bar"
                  style={{
                    width: `${molecule.intensity * 100}%`,
                    backgroundColor: molecule.color
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AromaMolecules;
