<template>
  <div class="island-container">
    <div class="island-header">
      <h1>🏝️ 海岛生存</h1>
      <p>在荒岛上建立你的生存基地</p>
    </div>
    
    <div class="island-main">
      <div class="stats-panel">
        <div class="stat-card">
          <div class="stat-icon">🍖</div>
          <div class="stat-content">
            <div class="stat-number">{{ gameStore.resources.food }}</div>
            <div class="stat-label">食物</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">💧</div>
          <div class="stat-content">
            <div class="stat-number">{{ gameStore.resources.water }}</div>
            <div class="stat-label">淡水</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🪵</div>
          <div class="stat-content">
            <div class="stat-number">{{ gameStore.resources.wood }}</div>
            <div class="stat-label">木材</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⛏️</div>
          <div class="stat-content">
            <div class="stat-number">{{ gameStore.resources.stone }}</div>
            <div class="stat-label">石头</div>
          </div>
        </div>
      </div>

      <div v-if="gameStore.actionQueue.length > 0" class="queue-panel" :key="tick">
        <h3>⏳ 行动队列 ({{ gameStore.actionQueue.length }})</h3>
        <div class="queue-list">
          <div v-for="(action, index) in gameStore.actionQueue" :key="action.id" 
               class="queue-item"
               :class="{ active: index === 0 }">
            <div class="queue-item-name">{{ action.name }}</div>
            <div v-if="index === 0" class="queue-item-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: getProgressPercent(action) + '%' }"></div>
              </div>
              <span class="progress-text">{{ getRemainingTime(action) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="actions-panel">
        <h3>📋 可执行操作</h3>
        
        <div class="action-grid">
          <div class="action-card" @click="gatherFood">
            <div class="action-icon">🍓</div>
            <div class="action-title">采集食物</div>
            <div class="action-desc">在岛上寻找可食用的果实和动物</div>
            <div class="action-time">耗时: 30秒</div>
          </div>
          
          <div class="action-card" @click="collectWater">
            <div class="action-icon">💧</div>
            <div class="action-title">收集淡水</div>
            <div class="action-desc">收集雨水或净化海水</div>
            <div class="action-time">耗时: 1分钟</div>
          </div>
          
          <div class="action-card" @click="chopWood">
            <div class="action-icon">🪓</div>
            <div class="action-title">砍伐木材</div>
            <div class="action-desc">砍伐树木获取木材资源</div>
            <div class="action-time">耗时: 2分钟</div>
          </div>
          
          <div class="action-card" @click="mineStone">
            <div class="action-icon">⛏️</div>
            <div class="action-title">挖掘石头</div>
            <div class="action-desc">在岛上挖掘石头资源</div>
            <div class="action-time">耗时: 3分钟</div>
          </div>
          
          <div class="action-card" @click="buildShelter">
            <div class="action-icon">🏠</div>
            <div class="action-title">建造庇护所</div>
            <div class="action-desc">建造一个安全的住所</div>
            <div class="action-cost">需要: 50木材, 30石头</div>
          </div>
          
          <div class="action-card" @click="craftTools">
            <div class="action-icon">🔨</div>
            <div class="action-title">制作工具</div>
            <div class="action-desc">制作更高效的生存工具</div>
            <div class="action-cost">需要: 20木材, 10石头</div>
          </div>
        </div>
      </div>
      
      <div class="map-panel">
        <h3>🗺️ 海岛地图</h3>
        <div class="map-container">
          <div class="map-grid">
            <div v-for="(cell, index) in gameStore.mapGrid" :key="index" 
                 :class="'map-cell ' + cell.type + (cell.explored ? ' explored' : '')"
                 @click="exploreCell(index)">
              {{ cell.icon }}
            </div>
          </div>
          <div class="map-legend">
            <div class="legend-item">
              <span class="legend-icon">🌳</span>
              <span>森林</span>
            </div>
            <div class="legend-item">
              <span class="legend-icon">🏔️</span>
              <span>山地</span>
            </div>
            <div class="legend-item">
              <span class="legend-icon">🌊</span>
              <span>海洋</span>
            </div>
            <div class="legend-item">
              <span class="legend-icon">🏠</span>
              <span>营地</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="message-log">
      <h3>📜 生存日志</h3>
      <div class="log-list">
        <div v-for="(msg, index) in gameStore.messageLog" :key="index" class="log-item">
          <span class="log-time">{{ msg.time }}</span>
          <span class="log-content">{{ msg.content }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useGameStore } from '../store';

const gameStore = useGameStore();

const tick = ref(0);
let tickTimer = null;

const getProgressPercent = (action) => {
  const elapsed = Date.now() - action.startTime;
  const percent = (elapsed / action.duration) * 100;
  return Math.min(percent, 100);
};

const getRemainingTime = (action) => {
  const remaining = action.startTime + action.duration - Date.now();
  if (remaining <= 0) return '即将完成';
  const seconds = Math.ceil(remaining / 1000);
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  }
  return `${seconds}秒`;
};

const gatherFood = () => {
  const result = gameStore.addAction('采集食物', {}, { food: 20 }, 30000);
  if (!result.success) {
    ElMessage.error(result.message);
  }
};

const collectWater = () => {
  const result = gameStore.addAction('收集淡水', {}, { water: 30 }, 60000);
  if (!result.success) {
    ElMessage.error(result.message);
  }
};

const chopWood = () => {
  const result = gameStore.addAction('砍伐木材', {}, { wood: 15 }, 120000);
  if (!result.success) {
    ElMessage.error(result.message);
  }
};

const mineStone = () => {
  const result = gameStore.addAction('挖掘石头', {}, { stone: 10 }, 180000);
  if (!result.success) {
    ElMessage.error(result.message);
  }
};

const buildShelter = () => {
  const result = gameStore.addAction(
    '建造庇护所',
    { wood: 50, stone: 30 },
    {},
    300000,
    'build',
    '庇护所建造完成！你现在有了一个安全的住所。'
  );
  if (!result.success) {
    ElMessage.error(result.message);
  }
};

const craftTools = () => {
  const result = gameStore.addAction(
    '制作工具',
    { wood: 20, stone: 10 },
    {},
    120000,
    'craft',
    '工具制作完成！你的工作效率提高了。'
  );
  if (!result.success) {
    ElMessage.error(result.message);
  }
};

const exploreCell = (index) => {
  const cell = gameStore.mapGrid[index];
  if (cell.explored) {
    ElMessage.info('这个区域已经探索过了');
    return;
  }
  
  ElMessageBox.confirm(
    `确定要探索这个区域吗？可能会遇到危险或发现资源。`,
    '探索未知区域',
    {
      confirmButtonText: '开始探索',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const result = gameStore.startExplore(index);
    if (!result.success) {
      ElMessage.error(result.message);
    }
  }).catch(() => {
    gameStore.addMessage('取消了探索');
  });
};

let gameOverShown = false;

const checkGameOver = () => {
  if (gameStore.isGameOver && !gameOverShown) {
    gameOverShown = true;
    ElMessageBox.alert(
      '你的食物或水耗尽了，游戏结束！',
      '游戏结束',
      {
        confirmButtonText: '重新开始',
        type: 'error'
      }
    ).then(() => {
      gameStore.resetGame();
      gameOverShown = false;
    });
  }
};

let checkInterval = null;

onMounted(() => {
  gameStore.initGame();
  checkInterval = setInterval(checkGameOver, 1000);
  tickTimer = setInterval(() => {
    tick.value++;
  }, 1000);
});

onUnmounted(() => {
  gameStore.cleanup();
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
});
</script>

<style scoped>
.island-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.island-header {
  text-align: center;
  color: white;
  margin-bottom: 30px;
}

.island-header h1 {
  font-size: 48px;
  margin: 0 0 10px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.island-header p {
  font-size: 18px;
  margin: 0;
  opacity: 0.9;
}

.island-main {
  max-width: 1200px;
  margin: 0 auto;
}

.stats-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 48px;
  margin-right: 20px;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.queue-panel {
  background: white;
  border-radius: 12px;
  padding: 20px 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.queue-panel h3 {
  margin: 0 0 15px 0;
  font-size: 20px;
  color: #333;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.queue-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px 16px;
  border-left: 4px solid #ddd;
  transition: all 0.3s ease;
}

.queue-item.active {
  border-left-color: #667eea;
  background: #f0f0ff;
}

.queue-item-name {
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.queue-item-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 4px;
  transition: width 1s linear;
}

.progress-text {
  font-size: 12px;
  color: #666;
  min-width: 60px;
  text-align: right;
}

.actions-panel {
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.actions-panel h3 {
  margin: 0 0 20px 0;
  font-size: 24px;
  color: #333;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.action-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.action-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.action-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.action-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.action-time,
.action-cost {
  font-size: 12px;
  color: #999;
}

.map-panel {
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.map-panel h3 {
  margin: 0 0 20px 0;
  font-size: 24px;
  color: #333;
}

.map-container {
  text-align: center;
}

.map-grid {
  display: grid;
  grid-template-columns: repeat(3, 100px);
  gap: 10px;
  justify-content: center;
  margin-bottom: 30px;
}

.map-cell {
  width: 100px;
  height: 100px;
  background: #f0f0f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid #ddd;
}

.map-cell:hover {
  transform: scale(1.05);
  border-color: #667eea;
}

.map-cell.explored {
  background: #e8f4fa;
  border-color: #409eff;
}

.map-legend {
  display: flex;
  justify-content: center;
  gap: 30px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.legend-icon {
  font-size: 24px;
}

.message-log {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.message-log h3 {
  margin: 0 0 20px 0;
  font-size: 24px;
  color: #333;
}

.log-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 10px;
}

.log-item {
  display: flex;
  margin-bottom: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.log-time {
  font-weight: bold;
  color: #409eff;
  margin-right: 12px;
  min-width: 60px;
}

.log-content {
  flex: 1;
  color: #666;
}

@media (max-width: 768px) {
  .island-header h1 {
    font-size: 32px;
  }
  
  .stats-panel {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>