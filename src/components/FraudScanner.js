import React, { useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";
import axios from 'axios';

ChartJS.register();

const FraudScanner = () => {
  const [contractAddress, setContractAddress] = useState("");
  const [network, setNetwork] = useState("mainnet");
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Keep only this RiskFactors object and remove the second one
  const RiskFactors = {
    TOKEN: {
      liquidityLock: {
        weight: 0.2,
        calculate: (locked) => {
          if (locked === undefined) return 0.5;
          return locked ? 0.2 : 0.8;
        }
      },
      ownerControl: {
        weight: 0.2,
        calculate: (control) => {
          if (!control) return 0.5;
          if (control.includes("verified") || control.includes("dead")) return 0.2;
          if (control.includes("Error") || control.includes("unknown")) return 0.8;
          return 0.6;
        }
      },
      mintingRestriction: {
        weight: 0.2,
        calculate: (status) => {
          if (!status) return 0.5;
          if (status.includes("Risky")) return 0.9;
          if (status.includes("No unlimited")) return 0.2;
          return 0.7;
        }
      },
      honeypotRisk: {
        weight: 0.2,
        calculate: (risk) => {
          if (!risk) return 0.5;
          if (risk.includes("detected")) return 0.9;
          if (risk.includes("No")) return 0.2;
          return 0.6;
        }
      },
      transactionHistory: {
        weight: 0.2,
        calculate: (history) => {
          if (!history) return 0.5;
          if (history.includes("Suspicious")) return 0.8;
          if (history.includes("Active")) return 0.3;
          return 0.6;
        }
      }
    },
    NFT: {
      liquidityLock: {
        weight: 0.2,
        calculate: (locked) => {
          if (locked === undefined) return 0.5;
          return locked ? 0.2 : 0.8;
        }
      },
      ownerControl: {
        weight: 0.2,
        calculate: (control) => {
          if (!control) return 0.5;
          if (control.includes("verified")) return 0.2;
          if (control.includes("Error")) return 0.8;
          return 0.6;
        }
      },
      mintingRestriction: {
        weight: 0.2,
        calculate: (status) => {
          if (!status) return 0.5;
          if (status.includes("Risky")) return 0.85;
          if (status.includes("No unlimited")) return 0.2;
          return 0.6;
        }
      },
      honeypotRisk: {
        weight: 0.2,
        calculate: (risk) => {
          if (!risk) return 0.5;
          if (risk.includes("detected")) return 0.9;
          if (risk.includes("No")) return 0.2;
          return 0.6;
        }
      },
      transactionHistory: {
        weight: 0.2,
        calculate: (history) => {
          if (!history) return 0.5;
          if (history.includes("Suspicious")) return 0.8;
          if (history.includes("Active")) return 0.3;
          return 0.6;
        }
      }
    }
  };
  
  const calculateOverallRisk = (data, type) => {
    const factors = RiskFactors[type];
    let totalRisk = 0;
    let totalWeight = 0;
  
    // Calculate weighted risk scores
    Object.entries(factors).forEach(([factor, { weight, calculate }]) => {
      const riskScore = calculate(data[factor.toLowerCase()]);
      totalRisk += riskScore * weight;
      totalWeight += weight;
    });
  
    // Normalize risk score (0-100)
    const normalizedRisk = (totalRisk / totalWeight) * 100;
  
    // Apply sigmoid function for better distribution
    const sigmoid = x => 1 / (1 + Math.exp(-0.1 * (x - 50)));
    const finalRisk = sigmoid(normalizedRisk) * 100;
  
    return Math.round(finalRisk);
  };
  
  // Add address validation function
  const isValidAddress = (address) => {
    // Check if address is empty or not a string
    if (!address || typeof address !== 'string') return false;
    
    // Check if address matches Ethereum address format (0x followed by 40 hexadecimal characters)
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Update the RiskFactors object to standardize the conditions
  // Rename the second risk factors object
  const StandardRiskFactors = {
    COMMON: {
      liquidityLock: {
        weight: 0.2,
        calculate: (locked) => {
          if (locked === undefined) return 0.5;
          return locked ? 0.2 : 0.8;
        }
      },
      ownerControl: {
        weight: 0.2,
        calculate: (control) => {
          if (!control) return 0.5;
          if (control.includes("verified") || control.includes("dead")) return 0.2;
          if (control.includes("Error") || control.includes("unknown")) return 0.8;
          return 0.6;
        }
      },
      mintingRestriction: {
        weight: 0.2,
        calculate: (status) => {
          if (!status) return 0.5;
          if (status.includes("Risky")) return 0.9;
          if (status.includes("No unlimited")) return 0.2;
          return 0.7;
        }
      },
      honeypotRisk: {
        weight: 0.2,
        calculate: (risk) => {
          if (!risk) return 0.5;
          if (risk.includes("detected")) return 0.9;
          if (risk.includes("No")) return 0.2;
          return 0.6;
        }
      },
      transactionHistory: {
        weight: 0.2,
        calculate: (history) => {
          if (!history) return 0.5;
          if (history.includes("Suspicious")) return 0.8;
          if (history.includes("Active")) return 0.3;
          return 0.6;
        }
      }
    }
  };
  
  // Update the handleScan function's risk calculation part
  const handleScan = async () => {
    setIsLoading(true);
    setError(null);
  
    // Validate address before making the API call
    if (!isValidAddress(contractAddress)) {
      setError("Please enter a valid Ethereum contract address (0x followed by 40 characters)");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: contractAddress
        })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
  
      // Standardized risk parameters
      const parameters = [
        'Liquidity Lock',
        'Owner Control',
        'Minting Restriction',
        'Honeypot Risk',
        'Transaction History'
      ];
  
      // Calculate scores using the standardized factors
      // In handleScan function, update the scores calculation:
      const scores = [
        RiskFactors[data.type].liquidityLock.calculate(data.liquidity_locked) * 100,
        RiskFactors[data.type].ownerControl.calculate(data.owner_control) * 100,
        RiskFactors[data.type].mintingRestriction.calculate(data.minting_restriction) * 100,
        RiskFactors[data.type].honeypotRisk.calculate(data.honeypot_risk) * 100,
        RiskFactors[data.type].transactionHistory.calculate(data.transaction_history) * 100
      ];
  
      // Calculate weighted average for overall risk
      const weights = parameters.map((_, i) => 0.2); // Equal weights of 20% each
      const overallRisk = scores.reduce((acc, score, i) => acc + score * weights[i], 0);
  
      // Update chart options for better visualization
      const chartOptions = {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { 
            display: true, 
            text: "Risk Analysis by Category",
            color: "#ffffff",
            font: { size: 16, weight: 'bold' }
          },
          tooltip: {
            callbacks: {
              label: (context) => `Risk Score: ${context.raw.toFixed(1)}%`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`,
              color: "#ffffff"
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)"
            }
          },
          x: {
            ticks: {
              color: "#ffffff"
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)"
            }
          }
        }
      };
  
      setScanResult({
        ...data,
        parameters,
        scores,
        overallRisk,
        chartOptions,
        riskColor: overallRisk > 75 ? "#ff0000" : overallRisk > 50 ? "#ffa500" : "#00ff00",
        decision: overallRisk > 75 
          ? "High Risk - Not Recommended" 
          : overallRisk > 50 
            ? "Medium Risk - Proceed with Caution" 
            : "Low Risk - Generally Safe"
      });
  
    } catch (err) {
      console.error('Scan error:', err);
      setError(`Failed to scan contract: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update the chart rendering in the return statement
  const NFTCollectionDetails = ({ metadata, floorPrice }) => {
    return (
      <div className="nft-details">
        <div className="nft-header">
          <div className="nft-logo">
            {metadata.collection_logo && (
              <img src={metadata.collection_logo} alt="Collection Logo" />
            )}
          </div>
          <div className="nft-title">
            <h2>{metadata.name}</h2>
            <span className="nft-symbol">{metadata.symbol}</span>
            {metadata.verified_collection && (
              <span className="verified-badge">✓ Verified</span>
            )}
          </div>
        </div>
  
        <div className="nft-grid">
          <div className="nft-info-card">
            <h3>Basic Information</h3>
            <p><strong>Contract Type:</strong> {metadata.contract_type}</p>
            <p><strong>Created Date:</strong> {new Date(metadata.created_date).toLocaleDateString()}</p>
            <p><strong>Floor Price:</strong> {
              metadata.floor_price 
                ? `${metadata.floor_price} ${metadata.floor_price_currency.toUpperCase()} ($${metadata.floor_price_usd})`
                : 'Not available'
            }</p>
          </div>
  
          <div className="nft-info-card">
            <h3>Description</h3>
            <p>{metadata.description}</p>
          </div>
  
          <div className="nft-info-card">
            <h3>Links</h3>
            <div className="nft-links">
              {metadata.project_url && (
                <a href={metadata.project_url} target="_blank" rel="noopener noreferrer">Website</a>
              )}
              {metadata.discord_url && (
                <a href={metadata.discord_url} target="_blank" rel="noopener noreferrer">Discord</a>
              )}
              {metadata.twitter_username && (
                <a href={`https://twitter.com/${metadata.twitter_username}`} target="_blank" rel="noopener noreferrer">Twitter</a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TokenDetails = ({ data }) => {
    return (
      <div className="token-details">
        <div className="token-grid">
          <div className="token-info-card">
            <h3>Token Metrics</h3>
            <div className="metric-item">
              <span>Total Liquidity:</span>
              <span className="value">
                ${typeof data.liquidity === 'number' 
                  ? data.liquidity.toLocaleString() 
                  : data.liquidity}
              </span>
            </div>
            <div className="metric-item">
              <span>Current Price:</span>
              <span className="value">
                ${typeof data.token_price === 'number' 
                  ? data.token_price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8
                    })
                  : data.token_price}
              </span>
            </div>
            <div className="metric-item">
              <span>24h Volume:</span>
              <span className="value">
                ${data.volume_24h ? data.volume_24h.toLocaleString() : 'N/A'}
              </span>
            </div>
            <div className="metric-item">
              <span>Market Cap:</span>
              <span className="value">
                ${data.market_cap ? data.market_cap.toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
  
          <div className="token-info-card">
            <h3>Contract Information</h3>
            <div className="metric-item">
              <span>Owner:</span>
              <span className="value address">{data.owner_control}</span>
            </div>
            <div className="metric-item">
              <span>Contract Type:</span>
              <span className="value">{data.contract_type || 'ERC20'}</span>
            </div>
            <div className="metric-item">
              <span>Total Supply:</span>
              <span className="value">
                {data.total_supply ? data.total_supply.toLocaleString() : 'N/A'}
              </span>
            </div>
            <div className="metric-item">
              <span>Circulating Supply:</span>
              <span className="value">
                {data.circulating_supply ? data.circulating_supply.toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
  
          <div className="token-info-card">
            <h3>Security Analysis</h3>
            <div className="metric-item">
              <span>Minting Status:</span>
              <span className={`value ${data.minting_restriction.includes("Risky") ? "warning" : "safe"}`}>
                {data.minting_restriction}
              </span>
            </div>
            <div className="metric-item">
              <span>Honeypot Check:</span>
              <span className={`value ${data.honeypot_risk.includes("detected") ? "danger" : "safe"}`}>
                {data.honeypot_risk}
              </span>
            </div>
            <div className="metric-item">
              <span>Transaction Activity:</span>
              <span className={`value ${data.transaction_history.includes("Suspicious") ? "warning" : "safe"}`}>
                {data.transaction_history}
              </span>
            </div>
            <div className="metric-item">
              <span>Liquidity Lock:</span>
              <span className={`value ${data.liquidity_locked ? "safe" : "warning"}`}>
                {data.liquidity_locked ? "Locked" : "Not Locked"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Update the render section to include TokenDetails
  return (
    <div className="scanner-container">
      {!scanResult ? (
        <div>
          <h1 className="title">Smart Scanner 😎</h1>
          <div className="scan-section">
            <input
              type="text"
              placeholder="Enter NFT or Token Contract Address (0x...)"
              className={`input-box ${contractAddress && !isValidAddress(contractAddress) ? 'invalid' : ''}`}
              value={contractAddress}
              onChange={(e) => {
                setContractAddress(e.target.value);
                if (error) setError(null);
              }}
            />
            <select className="network-dropdown" value={network} onChange={(e) => setNetwork(e.target.value)}>
              <option value="mainnet">Mainnet</option>
              <option value="testnet">Testnet</option>
            </select>
            {/* Fix: change loading to isLoading here too */}
            <button className="scan-button" onClick={handleScan} disabled={isLoading}>
              {isLoading ? 'Scanning...' : 'Analyze NFT and Tokens'}
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
      ) : (
        // In the result section of the return statement, update the conditional rendering:
        
        <div className="result-page">
          <h2 className="result-title">Analysis Result</h2>
          <p className="contract-address">Contract: {scanResult.address}</p>
          <p className="network-selected">Network: {scanResult.network}</p>
        
        {/*// Add condition for Token type */}
        {scanResult.type === 'TOKEN' && (
        <TokenDetails data={scanResult} />
        )}
        
        {/* Existing NFT condition */}
        {scanResult.type === 'NFT' && scanResult.rawData?.metadata && (
          <NFTCollectionDetails 
            metadata={scanResult.rawData.metadata} 
            floorPrice={scanResult.floorPrice}
          />
        )}
        
        {/* Chart and risk analysis section */}
        {scanResult.parameters && scanResult.scores && (
          <div className="chart-container">
            <Bar
              data={{
                labels: scanResult.parameters,
                datasets: [{
                  label: "Risk Score",
                  data: scanResult.scores,
                  backgroundColor: scanResult.scores.map(score =>
                    score > 75 ? "rgba(255, 0, 0, 0.8)" :
                    score > 50 ? "rgba(255, 165, 0, 0.8)" :
                    "rgba(0, 255, 0, 0.8)"
                  ),
                  borderColor: scanResult.scores.map(score =>
                    score > 75 ? "rgb(255, 0, 0)" :
                    score > 50 ? "rgb(255, 165, 0)" :
                    "rgb(0, 255, 0)"
                  ),
                  borderWidth: 1
                }]
              }}
              options={scanResult.chartOptions}
            />
          </div>
        )}
        
        <p className="overall-risk">Overall Risk: {scanResult.overallRisk.toFixed(2)}%</p>
       
        <p className="decision" style={{ color: scanResult.riskColor }}>
          {scanResult.decision}
        </p>
        <button 
          className="scan-button"
          onClick={() => {
            setScanResult(null);
            setContractAddress("");
            setNetwork("mainnet");
            setIsLoading(false);
            setError(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          Scan Another Contract
        </button>

        </div>
      )}
    </div>
  );
};

export default FraudScanner;
