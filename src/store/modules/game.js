import { defineStore } from 'pinia';

const STORAGE_KEY = 'island_survival_save';
const RESOURCE_CONSUME_INTERVAL = 60000;
const RESOURCE_CONSUME_AMOUNT = 5;

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const defaultResources = () => ({
  food: 100,
  water: 100,
  wood: 100,
  stone: 100
});

const defaultMapGrid = () => [
  { type: 'forest', icon: '🌳', explored: true },
  { type: 'forest', icon: '🌳', explored: true },
  { type: 'mountain', icon: '🏔️', explored: false },
  { type: 'ocean', icon: '🌊', explored: false },
  { type: 'camp', icon: '🏠', explored: true },
  { type: 'forest', icon: '🌳', explored: false },
  { type: 'ocean', icon: '🌊', explored: false },
  { type: 'mountain', icon: '🏔️', explored: false },
  { type: 'forest', icon: '🌳', explored: false }
];

const defaultMessageLog = () => [
  { time: '00:00', content: '你来到了一个荒岛，开始你的生存之旅吧！' }
];

const loadFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load game save:', e);
  }
  return null;
};

const generateExploreResult = () => {
  const random = Math.random();
  if (random < 0.3) {
    return { type: 'food', amount: Math.floor(Math.random() * 20) + 10 };
  } else if (random < 0.6) {
    return { type: 'wood', amount: Math.floor(Math.random() * 15) + 5 };
  } else if (random < 0.8) {
    return { type: 'stone', amount: Math.floor(Math.random() * 10) + 5 };
  } else {
    return { type: 'danger', foodLoss: 10, waterLoss: 10 };
  }
};

export default defineStore('game', {
  state: () => ({
    resources: defaultResources(),
    mapGrid: defaultMapGrid(),
    actionQueue: [],
    messageLog: defaultMessageLog(),
    lastSaveTime: Date.now(),
    lastConsumeTime: Date.now(),
    gameInitialized: false,
    queueTimer: null,
    consumeTimer: null,
    saveTimer: null
  }),

  getters: {
    isGameOver: (state) => state.resources.food <= 0 || state.resources.water <= 0,
    currentAction: (state) => state.actionQueue.length > 0 ? state.actionQueue[0] : null,
    actionCount: (state) => state.actionQueue.length
  },

  actions: {
    initGame() {
      if (this.gameInitialized) return;

      const saved = loadFromStorage();
      if (saved) {
        this.resources = saved.resources || defaultResources();
        this.mapGrid = saved.mapGrid || defaultMapGrid();
        this.actionQueue = saved.actionQueue || [];
        this.messageLog = saved.messageLog || defaultMessageLog();
        this.lastSaveTime = saved.lastSaveTime || Date.now();
        this.lastConsumeTime = saved.lastConsumeTime || Date.now();
        this.settleOffline();
      }

      this.gameInitialized = true;
      this.startTimers();
      this.saveGame();
    },

    startTimers() {
      this.stopTimers();

      this.queueTimer = setInterval(() => {
        this.processActionQueue();
      }, 1000);

      this.consumeTimer = setInterval(() => {
        this.consumeResources();
      }, 1000);

      this.saveTimer = setInterval(() => {
        this.saveGame();
      }, 5000);
    },

    stopTimers() {
      if (this.queueTimer) {
        clearInterval(this.queueTimer);
        this.queueTimer = null;
      }
      if (this.consumeTimer) {
        clearInterval(this.consumeTimer);
        this.consumeTimer = null;
      }
      if (this.saveTimer) {
        clearInterval(this.saveTimer);
        this.saveTimer = null;
      }
    },

    saveGame() {
      try {
        const saveData = {
          resources: this.resources,
          mapGrid: this.mapGrid,
          actionQueue: this.actionQueue,
          messageLog: this.messageLog,
          lastSaveTime: Date.now(),
          lastConsumeTime: this.lastConsumeTime
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
        this.lastSaveTime = Date.now();
      } catch (e) {
        console.error('Failed to save game:', e);
      }
    },

    addMessage(content) {
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      this.messageLog.push({ time, content });
      if (this.messageLog.length > 20) {
        this.messageLog.shift();
      }
    },

    getResourceName(key) {
      const names = {
        food: '食物',
        water: '淡水',
        wood: '木材',
        stone: '石头'
      };
      return names[key] || key;
    },

    addAction(name, cost, gain, duration, type = 'gather', completeMessage = null) {
      for (const [resource, amount] of Object.entries(cost)) {
        if (this.resources[resource] < amount) {
          return { success: false, message: `资源不足，无法${name}` };
        }
      }

      for (const [resource, amount] of Object.entries(cost)) {
        this.resources[resource] -= amount;
      }

      const action = {
        id: generateId(),
        name,
        cost,
        gain,
        duration,
        type,
        startTime: Date.now(),
        completeMessage
      };

      this.actionQueue.push(action);
      this.addMessage(`开始${name}...`);
      this.saveGame();

      return { success: true, message: `开始${name}` };
    },

    startExplore(index) {
      const cell = this.mapGrid[index];
      if (cell.explored) {
        return { success: false, message: '这个区域已经探索过了' };
      }

      const result = generateExploreResult();

      const action = {
        id: generateId(),
        name: `探索${cell.icon}区域`,
        type: 'explore',
        cellIndex: index,
        duration: 5000,
        startTime: Date.now(),
        result
      };

      this.actionQueue.push(action);
      this.addMessage(`开始探索${cell.icon}区域...`);
      this.saveGame();

      return { success: true, action };
    },

    processActionQueue() {
      const now = Date.now();
      const completed = [];

      while (this.actionQueue.length > 0) {
        const action = this.actionQueue[0];
        if (now >= action.startTime + action.duration) {
          this.actionQueue.shift();
          completed.push(action);
        } else {
          break;
        }
      }

      for (const action of completed) {
        this.completeAction(action);
      }

      if (completed.length > 0) {
        this.saveGame();
      }
    },

    completeAction(action) {
      if (action.type === 'explore') {
        this.completeExplore(action);
      } else {
        this.completeGather(action);
      }
    },

    completeGather(action) {
      for (const [resource, amount] of Object.entries(action.gain)) {
        this.resources[resource] += amount;
      }

      if (action.completeMessage) {
        this.addMessage(action.completeMessage);
      } else {
        const gainText = Object.entries(action.gain)
          .map(([k, v]) => `${v}${this.getResourceName(k)}`)
          .join('、');

        if (gainText) {
          this.addMessage(`${action.name}完成！获得了${gainText}`);
        } else {
          this.addMessage(`${action.name}完成！`);
        }
      }
    },

    completeExplore(action) {
      const cell = this.mapGrid[action.cellIndex];
      if (cell) {
        cell.explored = true;
      }

      const result = action.result;
      if (!result) return;

      if (result.type === 'danger') {
        this.resources.food -= result.foodLoss || 0;
        this.resources.water -= result.waterLoss || 0;
        if (this.resources.food < 0) this.resources.food = 0;
        if (this.resources.water < 0) this.resources.water = 0;
        this.addMessage(`探索遇到了危险！损失了${result.foodLoss}食物和${result.waterLoss}水`);
      } else {
        this.resources[result.type] += result.amount;
        const resourceName = this.getResourceName(result.type);
        this.addMessage(`探索发现了${resourceName}！获得${result.amount}${resourceName}`);
      }
    },

    consumeResources() {
      const now = Date.now();
      const elapsed = now - this.lastConsumeTime;

      if (elapsed >= RESOURCE_CONSUME_INTERVAL) {
        const cycles = Math.floor(elapsed / RESOURCE_CONSUME_INTERVAL);
        const foodConsume = cycles * RESOURCE_CONSUME_AMOUNT;
        const waterConsume = cycles * RESOURCE_CONSUME_AMOUNT;

        this.resources.food -= foodConsume;
        this.resources.water -= waterConsume;

        if (this.resources.food < 0) this.resources.food = 0;
        if (this.resources.water < 0) this.resources.water = 0;

        this.lastConsumeTime += cycles * RESOURCE_CONSUME_INTERVAL;
      }
    },

    settleOffline() {
      const now = Date.now();
      const offlineTime = now - this.lastSaveTime;

      if (offlineTime <= 0) return;

      const minutes = Math.floor(offlineTime / 60000);
      if (minutes <= 0) return;

      const consumeCycles = Math.floor(offlineTime / RESOURCE_CONSUME_INTERVAL);
      if (consumeCycles > 0) {
        const foodConsume = consumeCycles * RESOURCE_CONSUME_AMOUNT;
        const waterConsume = consumeCycles * RESOURCE_CONSUME_AMOUNT;

        this.resources.food -= foodConsume;
        this.resources.water -= waterConsume;

        if (this.resources.food < 0) this.resources.food = 0;
        if (this.resources.water < 0) this.resources.water = 0;

        this.lastConsumeTime += consumeCycles * RESOURCE_CONSUME_INTERVAL;

        this.addMessage(`离线期间消耗了 ${foodConsume} 食物和 ${waterConsume} 淡水`);
      }

      const completed = [];
      while (this.actionQueue.length > 0) {
        const action = this.actionQueue[0];
        if (now >= action.startTime + action.duration) {
          this.actionQueue.shift();
          completed.push(action);
        } else {
          break;
        }
      }

      if (completed.length > 0) {
        for (const action of completed) {
          this.completeAction(action);
        }
        this.addMessage(`离线期间完成了 ${completed.length} 个行动`);
      }

      this.addMessage(`欢迎回来！你离线了 ${minutes} 分钟`);
    },

    resetGame() {
      this.resources = defaultResources();
      this.mapGrid = defaultMapGrid();
      this.actionQueue = [];
      this.messageLog = defaultMessageLog();
      this.lastSaveTime = Date.now();
      this.lastConsumeTime = Date.now();
      this.saveGame();
      this.addMessage('重新开始游戏！');
    },

    cleanup() {
      this.stopTimers();
      this.saveGame();
    }
  }
});
