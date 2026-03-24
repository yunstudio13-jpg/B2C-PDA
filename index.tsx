import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

// --- Types & Interfaces ---

type CollectionOrderType = "电商仓单行" | "电商仓多行" | "总仓单行" | "总仓多行" | "混合";

type ViewType = 'dashboard' | 'taskList' | 'taskDetail' | 'inboundSearch' | 'inboundDetail' | 'boxDetail' | 'putaway' | 'locationAdjustment' | 'inventoryQuery' | 'settings' | 'stocktake';

interface InboundOrder {
  sapNo: string;
  type: string;
  warehouse: string;
  orderNo: string;
  createdTime: string;
  pendingCount: number;
}

interface InboundBox {
  boxNo: string;
  skuName: string;
  skuCode: string;
  spec: string;
  manufacturer: string;
  totalQty: number;
  pendingQty: number;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
}

const MOCK_INBOUND_ORDERS: InboundOrder[] = [
  {
    sapNo: "2657569758",
    type: "波次请货",
    warehouse: "兰州惠仁堂（兰州）电商仓",
    orderNo: "4142755744",
    createdTime: "2026-01-28 21:14:33",
    pendingCount: 5
  }
];

const MOCK_INBOUND_BOXES: InboundBox[] = [
  {
    boxNo: "0047943627",
    skuName: "附子理中丸(大蜜丸)",
    skuCode: "1080503025",
    spec: "9g*10丸",
    manufacturer: "北京同仁堂科技发展股份有限公司制药厂",
    totalQty: 50,
    pendingQty: 50,
    batchNo: "24015899",
    productionDate: "2024-12-02",
    expiryDate: "2029-11-30"
  },
  {
    boxNo: "0047943628",
    skuName: "附子理中丸(大蜜丸)",
    skuCode: "1080503025",
    spec: "9g*10丸",
    manufacturer: "北京同仁堂科技发展股份有限公司制药厂",
    totalQty: 50,
    pendingQty: 50,
    batchNo: "24015900", // Different batch
    productionDate: "2024-12-05",
    expiryDate: "2029-12-03"
  },
  {
    boxNo: "0047943629",
    skuName: "感冒清热颗粒",
    skuCode: "1080503030",
    spec: "12g*10袋",
    manufacturer: "北京同仁堂科技发展股份有限公司制药厂",
    totalQty: 100,
    pendingQty: 100,
    batchNo: "24020001", // Unique batch for this SKU
    productionDate: "2025-01-10",
    expiryDate: "2027-01-09"
  }
];

interface PickingItem {
  skuCode: string;
  skuName: string;
  spec: string;
  manufacturer: string;
  locationCode: string; // Empty if SIMPLE mode
  targetBatchNo: string;
  planQty: number;
  confirmedBoxQty: number;
  status: "PENDING" | "COMPLETED";
  productionDate: string;
  expiryDate: string;
}

interface PickingTask {
  taskId: string;
  warehouseName: string;
  date: string;
  collectionOrderType: CollectionOrderType;
  items: PickingItem[];
  allowBatchChange: boolean;
  isLocationMode: boolean; // Keep logic separate from display type
}

interface BatchStock {
  batchNo: string;
  expiryDate: string;
  qty: number;
  isLocked?: boolean;
}

// --- Icons (SVG Components) ---

const IconBox = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
);
const IconChevronDown = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
);
const IconScan = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect><line x1="12" y1="12" x2="12" y2="12"></line></svg>
);
const IconChevronLeft = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
);
const IconCheck = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);
const IconAlert = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);
const IconSearch = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);
const IconMapPin = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
);
const IconWarehouse = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"></path><path d="M3 7v14"></path><path d="M21 7v14"></path><path d="M9 21V11h6v10"></path><path d="M2 7l10-5 10 5"></path></svg>
);
const IconBarcode = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5v14"></path><path d="M8 5v14"></path><path d="M12 5v14"></path><path d="M17 5v14"></path><path d="M21 5v14"></path></svg>
);
const IconFileText = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);

// --- Mock Data ---

const MOCK_TASKS: PickingTask[] = [
  {
    taskId: "SO-202312001",
    warehouseName: "上海老百姓电商仓",
    date: "2023-12-15",
    collectionOrderType: "电商仓单行",
    allowBatchChange: true,
    isLocationMode: true,
    items: [
      {
        skuCode: "100102",
        skuName: "阿莫西林胶囊",
        spec: "0.25g*24粒/盒",
        manufacturer: "XX制药厂",
        locationCode: "A-01-05",
        targetBatchNo: "231105",
        planQty: 10,
        confirmedBoxQty: 0,
        status: "PENDING",
        productionDate: "2023-11-01",
        expiryDate: "2025-11-01",
      },
      {
        skuCode: "800231",
        skuName: "感冒灵颗粒",
        spec: "10g*9袋/盒",
        manufacturer: "华润三九",
        locationCode: "A-03-12",
        targetBatchNo: "20230901",
        planQty: 20,
        confirmedBoxQty: 0,
        status: "PENDING",
        productionDate: "2023-09-01",
        expiryDate: "2025-09-01",
      }
    ],
  },
  {
    taskId: "SO-202312002",
    warehouseName: "北京总仓多行区",
    date: "2023-12-15",
    collectionOrderType: "总仓多行",
    allowBatchChange: false,
    isLocationMode: false,
    items: [
      {
        skuCode: "220551",
        skuName: "医用外科口罩",
        spec: "50片/盒",
        manufacturer: "稳健医疗",
        locationCode: "",
        targetBatchNo: "DEFAULT",
        planQty: 50,
        confirmedBoxQty: 0,
        status: "PENDING",
        productionDate: "2023-10-15",
        expiryDate: "2026-10-15",
      }
    ]
  },
  {
    taskId: "SO-202312003",
    warehouseName: "广州混合仓",
    date: "2023-12-16",
    collectionOrderType: "混合",
    allowBatchChange: true,
    isLocationMode: true,
    items: [
      {
        skuCode: "330112",
        skuName: "布洛芬缓释胶囊",
        spec: "0.3g*24粒/盒",
        manufacturer: "中美史克",
        locationCode: "B-02-01",
        targetBatchNo: "231201",
        planQty: 5,
        confirmedBoxQty: 5,
        status: "COMPLETED",
        productionDate: "2023-12-01",
        expiryDate: "2026-12-01",
      }
    ]
  }
];

const MOCK_INVENTORY: BatchStock[] = [
  { batchNo: "231105", expiryDate: "2025-11-05", qty: 100 },
  { batchNo: "231001", expiryDate: "2025-10-01", qty: 50 },
  { batchNo: "230915", expiryDate: "2025-09-15", qty: 25, isLocked: true }, // Locked batch
];

// --- Components ---

// 1. Dashboard Component
const Dashboard = ({ tasks, onNavigate }: { tasks: PickingTask[], onNavigate: (view: string) => void }) => {
  const [selectedWarehouse, setSelectedWarehouse] = React.useState("上海1号仓");
  const warehouses = ["上海1号仓", "北京2号仓", "广州3号仓", "深圳4号仓"];

  const menuItems = [
    { id: 'pick', label: '拣货任务', icon: '📦', color: '#eff6ff', textColor: '#1d4ed8' },
    { id: 'inbound', label: '收货箱入库', icon: '📥', color: '#f0fdf4', textColor: '#15803d' },
    { id: 'query', label: '库存查询', icon: '🔍', color: '#f1f5f9', textColor: '#334155' },
    { id: 'adjust', label: '货位调整', icon: '⇆', color: '#fdf4ff', textColor: '#a21caf' },
    { id: 'putaway', label: '待上架', icon: '🪜', color: '#fff7ed', textColor: '#c2410c' },
    { id: 'trace', label: '溯源码二次复核', icon: '🛡️', color: '#f1f5f9', textColor: '#334155' },
    { id: 'stocktake', label: '盘点', icon: '📋', color: '#f1f5f9', textColor: '#334155' },
    { id: 'settings', label: '系统设置', icon: '⚙️', color: '#f1f5f9', textColor: '#334155' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'var(--primary)', color: 'white', padding: '20px', paddingBottom: '30px' }}>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>B2C仓库管理</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '13px', opacity: 0.8 }}>
          <span>用户: 操作员 01</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
        
        {/* Warehouse Dropdown */}
        <div style={{ marginTop: '20px', position: 'relative' }}>
          <select 
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {warehouses.map(w => <option key={w} value={w} style={{ color: 'black' }}>{w}</option>)}
          </select>
          <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <span style={{ fontSize: '12px' }}>▼</span>
          </div>
        </div>
      </div>

      {/* Grid Menu */}
      <div style={{ padding: '24px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', flex: 1, overflowY: 'auto' }}>
        {menuItems.map(item => (
          <div 
            key={item.id}
            onClick={() => {
              if (item.id === 'pick') onNavigate('taskList');
              if (item.id === 'inbound') onNavigate('inboundSearch');
              if (item.id === 'adjust') onNavigate('locationAdjustment');
              if (item.id === 'putaway') onNavigate('putaway');
              if (item.id === 'query') onNavigate('inventoryQuery');
              if (item.id === 'settings') onNavigate('settings');
              if (item.id === 'stocktake') alert('盘点模块开发中...');
            }}
            style={{ 
              background: 'white', 
              borderRadius: '16px', 
              padding: '20px 8px',
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '32px' }}>{item.icon}</div>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#334155', textAlign: 'center' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Bottom Nav */}
      <div style={{ background: 'white', borderTop: '1px solid var(--border)', padding: '12px', display: 'flex', justifyContent: 'space-around' }}>
        <div style={{ textAlign: 'center', color: 'var(--accent)' }}>
          <div style={{ fontSize: '18px' }}>🏠</div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>首页</div>
        </div>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '18px' }}>💬</div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>AI小丸子</div>
        </div>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '18px' }}>👤</div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>我的</div>
        </div>
      </div>
    </div>
  );
};

// 2. Task List Component
const TaskList = ({ tasks, onSelectTask, onBack }: { tasks: PickingTask[], onSelectTask: (task: PickingTask) => void, onBack: () => void }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  const filteredTasks = tasks.filter(task => {
    const completedItems = task.items.filter(i => i.status === "COMPLETED").length;
    const totalItems = task.items.length;
    const isCompleted = completedItems === totalItems;
    return activeTab === 'completed' ? isCompleted : !isCompleted;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <div style={{ background: 'white', padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div onClick={onBack} style={{ cursor: 'pointer', padding: '4px' }}>
          <IconChevronLeft color="#334155" />
        </div>
        <div style={{ fontSize: '16px', fontWeight: '600' }}>拣货任务列表</div>
      </div>

      <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <input 
            type="text" 
            placeholder="扫描单号或搜索商品" 
            style={{ 
              width: '100%', 
              padding: '12px 12px 12px 40px', 
              borderRadius: '8px', 
              border: '1px solid var(--border)',
              background: 'white',
              fontSize: '14px'
            }} 
          />
          <div style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }}>
            <IconSearch />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', marginBottom: '16px' }}>
          <div 
            onClick={() => setActiveTab('pending')}
            style={{ 
              flex: 1, 
              textAlign: 'center', 
              padding: '8px', 
              borderRadius: '6px', 
              fontSize: '14px',
              fontWeight: activeTab === 'pending' ? '600' : '400',
              background: activeTab === 'pending' ? 'white' : 'transparent',
              color: activeTab === 'pending' ? 'var(--primary)' : '#64748b',
              boxShadow: activeTab === 'pending' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            待拣货
          </div>
          <div 
            onClick={() => setActiveTab('completed')}
            style={{ 
              flex: 1, 
              textAlign: 'center', 
              padding: '8px', 
              borderRadius: '6px', 
              fontSize: '14px',
              fontWeight: activeTab === 'completed' ? '600' : '400',
              background: activeTab === 'completed' ? 'white' : 'transparent',
              color: activeTab === 'completed' ? 'var(--primary)' : '#64748b',
              boxShadow: activeTab === 'completed' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            已拣货
          </div>
        </div>

        {filteredTasks.length > 0 ? filteredTasks.map(task => {
           const completedItems = task.items.filter(i => i.status === "COMPLETED").length;
           const totalItems = task.items.length;
           const progress = (completedItems / totalItems) * 100;
           
           return (
            <div 
              key={task.taskId}
              onClick={() => onSelectTask(task)}
              style={{ 
                background: 'white', 
                borderRadius: '12px', 
                padding: '16px', 
                marginBottom: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid var(--border)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{task.taskId}</span>
                <span style={{ 
                  fontSize: '12px', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  background: progress === 100 ? '#dcfce7' : '#e0f2fe',
                  color: progress === 100 ? '#166534' : '#0369a1',
                  fontWeight: '500'
                }}>
                  {progress === 100 ? '已完成' : '进行中'}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                {task.warehouseName}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }}></div>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', minWidth: '40px', textAlign: 'right' }}>
                  {completedItems}/{totalItems}
                </div>
              </div>
              
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#94a3b8' }}>集单类型: {task.collectionOrderType}</span>
                <span style={{ color: 'var(--accent)' }}>{progress === 100 ? '查看详情' : '开始作业'} &rarr;</span>
              </div>
            </div>
           );
        }) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontSize: '14px' }}>暂无{activeTab === 'pending' ? '待拣货' : '已拣货'}任务</div>
          </div>
        )}
      </div>
    </div>
  );
};

// 3. Batch Selection Modal
const BatchSelector = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  currentBatch 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelect: (batch: string) => void;
  currentBatch: string;
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
    }}>
      <div className="animate-slide-up" style={{ 
        background: 'white', 
        borderTopLeftRadius: '20px', 
        borderTopRightRadius: '20px',
        padding: '24px 20px',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>选择库存批号</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: '5px', fontSize: '20px' }}>&times;</button>
        </div>

        <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>当前推荐批号</div>
          <div style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'monospace' }}>{currentBatch}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {MOCK_INVENTORY.map(stock => (
            <div 
              key={stock.batchNo}
              onClick={() => !stock.isLocked && onSelect(stock.batchNo)}
              style={{ 
                padding: '16px', 
                borderRadius: '8px',
                border: stock.batchNo === currentBatch ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: stock.isLocked ? '#f1f5f9' : 'white',
                opacity: stock.isLocked ? 0.7 : 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: stock.isLocked ? 'not-allowed' : 'pointer'
              }}
            >
              <div>
                <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {stock.batchNo}
                  {stock.isLocked && <span style={{ fontSize: '10px', background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px' }}>锁定</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>有效期: {stock.expiryDate}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '600', color: 'var(--success)' }}>{stock.qty} 盒</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>可用库存</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 4. Task Detail Component (Core Logic)
const TaskDetail = ({ task, onBack, onComplete }: { task: PickingTask, onBack: () => void, onComplete: () => void }) => {
  const [items, setItems] = useState<PickingItem[]>(task.items);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'wizard' | 'list'>('wizard');
  const [scannedLocation, setScannedLocation] = useState("");
  const [scannedBatch, setScannedBatch] = useState("");
  const [targetBatch, setTargetBatch] = useState(items[0].targetBatchNo);
  const [inputQty, setInputQty] = useState<string>(items[0].planQty.toString());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const currentItem = items[currentIndex];
  const isLocationMode = task.isLocationMode;
  
  // Validation States
  const isLocationValid = !isLocationMode || scannedLocation === currentItem.locationCode;
  const isBatchValid = !isLocationMode || scannedBatch === targetBatch;
  
  // Reset state when moving to next item
  useEffect(() => {
    setScannedLocation("");
    setScannedBatch(isLocationMode ? "" : currentItem.targetBatchNo);
    setTargetBatch(currentItem.targetBatchNo);
    setInputQty(currentItem.planQty.toString());
    setErrorMsg("");
  }, [currentIndex, currentItem, isLocationMode]);

  // Actions
  const handleVibrate = () => {
    if (navigator.vibrate) navigator.vibrate(200);
  };

  const handleSimulateScanLocation = () => {
    setScannedLocation(currentItem.locationCode);
    setErrorMsg("");
  };

  const handleSimulateScanBatch = () => {
    // 80% chance to scan correct, 20% wrong for demo
    if (Math.random() > 0.1) {
      setScannedBatch(targetBatch);
      setErrorMsg("");
    } else {
      setScannedBatch("WRONG-BATCH-123");
      handleVibrate();
      setErrorMsg("批号校验错误!");
    }
  };

  const handleChangeBatch = (newBatch: string) => {
    setTargetBatch(newBatch);
    setScannedBatch(newBatch); // Auto scan the selected batch or require re-scan? Let's auto-fill for usability
    setShowBatchModal(false);
  };

  const handleConfirm = () => {
    const qty = parseFloat(inputQty);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("输入数量无效。");
      handleVibrate();
      return;
    }

    if (qty > currentItem.planQty) {
      // Allow over-pick? Usually no.
      setErrorMsg("不能超过待拣数量。");
      handleVibrate();
      return;
    }

    // Success logic
    const updatedItems = [...items];
    updatedItems[currentIndex] = { ...currentItem, status: "COMPLETED", confirmedBoxQty: qty };
    setItems(updatedItems);

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowConfirmModal(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
      {/* Header */}
      <div style={{ background: 'white', padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div onClick={onBack} style={{ cursor: 'pointer' }}><IconChevronLeft color="#334155" /></div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>{task.taskId}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {viewMode === 'wizard' ? `第 ${currentIndex + 1} / ${items.length} 行` : `共 ${items.length} 条商品`}
            </div>
          </div>
        </div>
        <div 
          onClick={() => setViewMode(viewMode === 'wizard' ? 'list' : 'wizard')}
          style={{ fontSize: '12px', padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', color: '#64748b', cursor: 'pointer' }}>
          {viewMode === 'wizard' ? '切换清单模式' : '切换详情模式'}
        </div>
      </div>

      {viewMode === 'list' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#f8fafc' }}>
          {items.map((item, index) => (
            <div 
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                setViewMode('wizard');
              }}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                border: index === currentIndex ? '2px solid var(--accent)' : '1px solid var(--border)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--primary)' }}>
                  {item.locationCode || '无货位'}
                </span>
                <span style={{ 
                  fontSize: '11px', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  background: item.status === 'COMPLETED' ? '#dcfce7' : '#f1f5f9',
                  color: item.status === 'COMPLETED' ? '#166534' : '#64748b',
                  fontWeight: '500'
                }}>
                  {item.status === 'COMPLETED' ? '已完成' : '待拣'}
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px', color: 'var(--primary)' }}>{item.skuName}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>规格: {item.spec}</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  批号: <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{item.targetBatchNo}</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>
                  <span style={{ color: item.status === 'COMPLETED' ? 'var(--success)' : 'var(--accent)' }}>
                    {item.confirmedBoxQty}
                  </span> / {item.planQty} 盒
                </div>
              </div>
            </div>
          ))}
          
          {/* Summary Action in List Mode */}
          <div style={{ padding: '20px 0' }}>
            <button 
              onClick={() => setShowConfirmModal(true)}
              style={{ 
                width: '100%', padding: '14px', 
                background: 'var(--success)', 
                color: 'white', 
                border: 'none', borderRadius: '12px',
                fontSize: '16px', fontWeight: '600',
                boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.3)',
                cursor: 'pointer'
              }}
            >
              完成拣货
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>
          
          {/* Step 1: Location Card (Only in Location Mode) */}
          {isLocationMode && (
            <div style={{ 
              background: 'white', 
              border: '1px solid var(--border)',
              padding: '20px', 
              borderRadius: '12px', 
              marginBottom: '16px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              transition: 'all 0.3s'
            }}>
              <div style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: '1px' }}>
                {currentItem.locationCode}
              </div>
            </div>
          )}

          {/* Step 2: Item Info */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)', marginBottom: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
               <span style={{ fontSize: '12px', color: '#64748b' }}>编码: {currentItem.skuCode}</span>
               <span style={{ fontSize: '12px', color: '#64748b' }}>{currentItem.manufacturer}</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{currentItem.skuName}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', color: '#475569', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
                规格: {currentItem.spec}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
              <span>生产日期: {currentItem.productionDate}</span>
              <span>有效期: {currentItem.expiryDate}</span>
            </div>
          </div>

          {/* Step 3: Batch Verification */}
          {isLocationMode && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)', marginBottom: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                 <span style={{ fontSize: '13px', fontWeight: '600' }}>批号核对</span>
                 {task.allowBatchChange && (
                   <button 
                    onClick={() => setShowBatchModal(true)}
                    style={{ fontSize: '11px', color: 'var(--accent)', background: '#eff6ff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                     修改批号
                   </button>
                 )}
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>推荐</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: '600' }}>{targetBatch}</div>
                  </div>
               </div>
            </div>
          )}

          {/* Step 4: Quantity Input */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)', marginBottom: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>确认数量</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>待拣: <b>{currentItem.planQty}</b></span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input 
                  type="number" 
                  value={inputQty}
                  onChange={(e) => setInputQty(e.target.value)}
                  style={{ 
                    width: '100%', height: '40px', textAlign: 'center', 
                    fontSize: '18px', fontWeight: '600',
                    borderRadius: '8px', border: '1px solid var(--border)',
                    color: 'var(--primary)'
                  }}
                />
                <span style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '12px', color: '#94a3b8' }}>盒</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div style={{ 
              padding: '12px', background: '#fef2f2', color: '#ef4444', 
              borderRadius: '8px', marginBottom: '16px', fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <IconAlert size={16} /> {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* Footer / Action Bar (Only in Wizard Mode) */}
      {viewMode === 'wizard' && (
        <div style={{ 
          position: 'fixed', bottom: 0, left: 0, right: 0, 
          background: 'white', padding: '16px', 
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)',
          display: 'flex', gap: '12px'
        }}>
          {currentIndex > 0 && (
            <button 
              onClick={handlePrev}
              style={{ 
                flex: 1, padding: '14px', 
                background: 'white', 
                color: '#64748b', 
                border: '1px solid var(--border)', borderRadius: '12px',
                fontSize: '16px', fontWeight: '600'
              }}
            >
              上一页
            </button>
          )}
          <button 
            onClick={handleConfirm}
            style={{ 
              flex: 2, padding: '14px', 
              background: 'var(--success)', 
              color: 'white', 
              border: 'none', borderRadius: '12px',
              fontSize: '16px', fontWeight: '600',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.3)'
            }}
          >
            完成拣货
          </button>
        </div>
      )}

      <BatchSelector 
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onSelect={handleChangeBatch}
        currentBatch={targetBatch}
      />

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', width: '100%', maxWidth: '320px',
            padding: '24px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--primary)' }}>确认完成拣货？</div>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>确认后任务状态将变更为已完成</div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', color: '#64748b', fontWeight: '600' }}
              >
                取消
              </button>
              <button 
                onClick={() => {
                  setShowConfirmModal(false);
                  onComplete();
                }}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--success)', color: 'white', fontWeight: '600' }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 5. Inbound Search Component
const InboundSearch = ({ onQueryDetails, onBack }: { onQueryDetails: (order: InboundOrder) => void, onBack: () => void }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<InboundOrder | null>(null);
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <div style={{ background: 'white', padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={{ border: 'none', background: 'none', fontSize: '20px' }}>←</button>
          <div style={{ flex: 1, position: 'relative' }}>
            <input 
              placeholder="请扫描或输入SAP单号" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>
        </div>
      </div>
      
      <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>选择入库单 (共{MOCK_INBOUND_ORDERS.length}个)</div>
        
        {/* Horizontal Scrollable Orders */}
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none' }}>
          {MOCK_INBOUND_ORDERS.map(order => (
            <div 
              key={order.sapNo}
              onClick={() => setSelectedOrder(selectedOrder?.sapNo === order.sapNo ? null : order)}
              style={{ 
                minWidth: '160px',
                background: selectedOrder?.sapNo === order.sapNo ? '#f0f7ff' : 'white', 
                padding: '12px 16px', 
                borderRadius: '12px', 
                border: selectedOrder?.sapNo === order.sapNo ? '1.5px solid var(--accent)' : '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ color: 'var(--accent)', fontWeight: 'bold', marginBottom: '4px', fontSize: '15px' }}>{order.sapNo}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>{order.createdTime}</div>
              <div style={{ fontSize: '14px', color: '#334155' }}>待入库: {order.pendingCount}</div>
            </div>
          ))}
        </div>

        {/* Details View */}
        {selectedOrder && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#64748b' }}>入库类型:</span>
              <span style={{ color: '#334155' }}>{selectedOrder.type}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#64748b' }}>收货仓库:</span>
              <span style={{ color: '#334155', textAlign: 'right', flex: 1, marginLeft: '20px' }}>{selectedOrder.warehouse}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#64748b' }}>请货单号:</span>
              <span style={{ color: '#334155' }}>{selectedOrder.orderNo}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#64748b' }}>SAP单号:</span>
              <span style={{ color: '#334155' }}>{selectedOrder.sapNo}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>创建时间:</span>
              <span style={{ color: '#334155' }}>{selectedOrder.createdTime}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions when an order is selected */}
      {selectedOrder && (
        <div style={{ padding: '16px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={() => setSelectedOrder(null)}
            style={{ padding: '14px', borderRadius: '8px', border: 'none', background: '#cbd5e1', color: '#334155', fontWeight: '600' }}
          >
            重置
          </button>
          <button 
            onClick={() => onQueryDetails(selectedOrder)}
            style={{ padding: '14px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'white', fontWeight: '600' }}
          >
            查询商品明细
          </button>
        </div>
      )}
    </div>
  );
};

// 7. Box Detail Component
const BoxDetail = ({ boxes, onPutaway, onCrossDock, onBack }: { boxes: InboundBox[], onPutaway: (boxes: InboundBox[]) => void, onCrossDock: () => void, onBack: () => void }) => {
  const [selectedBoxNos, setSelectedBoxNos] = useState<string[]>([boxes[0].boxNo]);
  const [showProductionInfo, setShowProductionInfo] = useState(false);
  const [showInboundReminder, setShowInboundReminder] = useState(false);
  
  const toggleBox = (boxNo: string) => {
    setSelectedBoxNos(prev => 
      prev.includes(boxNo) 
        ? prev.filter(id => id !== boxNo)
        : [...prev, boxNo]
    );
  };

  const selectedBoxes = boxes.filter(b => selectedBoxNos.includes(b.boxNo));
  const displayBox = selectedBoxes[0] || boxes[0];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <div style={{ background: 'white', padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', fontSize: '20px' }}>←</button>
        <div style={{ flex: 1 }}>
          <input 
            placeholder="请扫描或输入箱号" 
            style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
          />
        </div>
      </div>
      
      <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>选择箱号 (共{boxes.length}个)</div>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none' }}>
          {boxes.map(box => (
            <div 
              key={box.boxNo}
              onClick={() => toggleBox(box.boxNo)}
              style={{ 
                minWidth: '130px', 
                background: selectedBoxNos.includes(box.boxNo) ? '#f0f7ff' : 'white', 
                padding: '12px', 
                borderRadius: '12px', 
                border: selectedBoxNos.includes(box.boxNo) ? '1.5px solid var(--accent)' : '1px solid #e2e8f0',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
            >
              <div style={{ color: 'var(--accent)', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>{box.boxNo}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>商品数量: {box.totalQty}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>待入库: {box.pendingQty}</div>
            </div>
          ))}
        </div>
        
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', marginTop: '12px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: '600' }}>商品明细</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>已选箱数: {selectedBoxNos.length}</div>
            </div>
          </div>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>{displayBox.skuName} ({displayBox.skuCode})</div>
                  <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>到货/入库:{displayBox.totalQty}/0</div>
                </div>
                <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
                  <div style={{ display: 'flex', marginBottom: '8px' }}>
                    <span style={{ width: '70px' }}>规格:</span>
                    <span style={{ color: '#334155' }}>{displayBox.spec}</span>
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px' }}>
                    <span style={{ width: '70px' }}>厂家:</span>
                    <span style={{ color: '#334155', flex: 1 }}>{displayBox.manufacturer}</span>
                  </div>
                </div>
                <div 
                  onClick={() => setShowProductionInfo(true)}
                  style={{ marginTop: '16px', color: 'var(--accent)', fontSize: '13px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>【生产信息详情】</span>
                  <span style={{ fontSize: '10px' }}>▶</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ padding: '16px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
        <button 
          disabled={selectedBoxNos.length === 0}
          onClick={() => onPutaway(selectedBoxes)}
          style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', background: selectedBoxNos.length === 0 ? '#cbd5e1' : 'var(--accent)', color: 'white', fontWeight: '600' }}
        >
          扫码上架
        </button>
        <button 
          onClick={() => setShowInboundReminder(true)}
          style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', background: '#cbd5e1', color: '#334155', fontWeight: '600' }}
        >
          不上货架
        </button>
      </div>

      {showInboundReminder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', width: '100%', maxWidth: '340px',
            padding: '24px', textAlign: 'left'
          }}>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1e293b' }}>不上货架需入库提醒</div>
            
            <div style={{ marginBottom: '12px', fontSize: '14px', color: '#64748b' }}>收货箱号:</div>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', color: '#334155', fontFamily: 'monospace' }}>
              {selectedBoxNos.map(no => <div key={no}>{no}</div>)}
            </div>
            
            <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', marginBottom: '24px' }}>
              确认收货后，请在B2C系统-待发货管理，选择预分配订单生成拣货任务。
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowInboundReminder(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '600' }}
              >
                取消
              </button>
              <button 
                onClick={() => {
                  setShowInboundReminder(false);
                  onCrossDock();
                }}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: '600' }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {showProductionInfo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }} onClick={() => setShowProductionInfo(false)}></div>
          <div style={{ background: 'white', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '20px', maxHeight: '80%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'var(--accent)', padding: '12px 16px', borderRadius: '8px', color: 'white' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>批号 {displayBox.batchNo}</div>
              <div style={{ background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>必采</div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', padding: '0 4px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>生产日期</div>
                <div style={{ fontWeight: '600' }}>{displayBox.productionDate}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>有效期</div>
                <div style={{ fontWeight: '600' }}>{displayBox.expiryDate}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '16px' }}>溯源码列表</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>溯源码 {i}</div>
                    <div style={{ fontSize: '13px', color: '#334155', wordBreak: 'break-all', fontWeight: '500' }}>
                      8362221051859912436{i}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              onClick={() => setShowProductionInfo(false)}
              style={{ width: '100%', marginTop: '24px', padding: '14px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'white', fontWeight: '600' }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 8. Putaway Component
const Putaway = ({ boxes, onConfirm, onBack }: { boxes: InboundBox[], onConfirm: () => void, onBack: () => void }) => {
  const [location, setLocation] = useState("th9999");
  const [activeTab, setActiveTab] = useState<'in' | 'out'>('in');
  const [showProductionInfo, setShowProductionInfo] = useState(false);
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  
  // Group boxes by SKU
  const skus = Array.from(new Set(boxes.map(b => b.skuCode))).map(code => {
    const box = boxes.find(b => b.skuCode === code)!;
    return { code, name: box.skuName };
  });

  const [selectedSkuCode, setSelectedSkuCode] = useState(skus[0].code);
  
  // Get batches for selected SKU
  const skuBatches = boxes.filter(b => b.skuCode === selectedSkuCode);
  const uniqueBatches = Array.from(new Set(skuBatches.map(b => b.batchNo)));
  
  const [selectedBatchNo, setSelectedBatchNo] = useState(uniqueBatches[0]);
  
  // Update batch if SKU changes
  useEffect(() => {
    const newBatches = Array.from(new Set(boxes.filter(b => b.skuCode === selectedSkuCode).map(b => b.batchNo)));
    setSelectedBatchNo(newBatches[0]);
  }, [selectedSkuCode, boxes]);

  const currentBox = boxes.find(b => b.skuCode === selectedSkuCode && b.batchNo === selectedBatchNo) || boxes[0];
  const [qty, setQty] = useState(currentBox.pendingQty.toString());

  useEffect(() => {
    setQty(currentBox.pendingQty.toString());
  }, [currentBox]);

  const isBatchUnique = uniqueBatches.length === 1;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <div style={{ background: 'white', padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', fontSize: '20px' }}>←</button>
        <div style={{ fontSize: '16px', fontWeight: '600' }}>上架环节</div>
      </div>
      
      <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>库位选择 <span style={{ color: 'red' }}>*</span></div>
          <div style={{ position: 'relative' }}>
            <input 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', marginBottom: '12px' }}
            />
            <div style={{ position: 'absolute', right: '12px', top: '12px', color: '#94a3b8' }}>
              <IconScan size={18} />
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>库位号:</span>
              <span style={{ color: '#334155', fontSize: '13px' }}>TH9999</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>库位状态:</span>
              <span style={{ color: '#334155', fontSize: '13px' }}>退货库位</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
          <div 
            onClick={() => setActiveTab('in')}
            style={{ flex: 1, textAlign: 'center', padding: '12px', color: activeTab === 'in' ? 'var(--accent)' : '#64748b', borderBottom: activeTab === 'in' ? '2px solid var(--accent)' : 'none', fontWeight: '600' }}
          >
            入库行明细
          </div>
          <div 
            onClick={() => setActiveTab('out')}
            style={{ flex: 1, textAlign: 'center', padding: '12px', color: activeTab === 'out' ? 'var(--accent)' : '#64748b', borderBottom: activeTab === 'out' ? '2px solid var(--accent)' : 'none', fontWeight: '600' }}
          >
            未入库行明细 <span style={{ background: 'red', color: 'white', padding: '0 6px', borderRadius: '10px', fontSize: '10px' }}>1</span>
          </div>
        </div>
        
        {activeTab === 'in' ? (
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: '12px', position: 'relative' }}>
              <select 
                value={selectedSkuCode}
                onChange={(e) => setSelectedSkuCode(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #e2e8f0', outline: 'none', appearance: 'none', background: 'white' }}
              >
                {skus.map(sku => <option key={sku.code} value={sku.code}>{sku.name} ({sku.code})</option>)}
              </select>
              <div style={{ position: 'absolute', right: '10px', top: '12px', pointerEvents: 'none', color: '#94a3b8' }}>▼</div>
            </div>
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <select 
                value={selectedBatchNo}
                onChange={(e) => setSelectedBatchNo(e.target.value)}
                disabled={isBatchUnique}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  border: '1px solid #e2e8f0', 
                  outline: 'none', 
                  appearance: 'none', 
                  background: isBatchUnique ? '#f1f5f9' : 'white',
                  cursor: isBatchUnique ? 'not-allowed' : 'pointer'
                }}
              >
                {uniqueBatches.map(batch => <option key={batch} value={batch}>{batch}</option>)}
              </select>
              {!isBatchUnique && <div style={{ position: 'absolute', right: '10px', top: '12px', pointerEvents: 'none', color: '#94a3b8' }}>▼</div>}
            </div>
            
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>规格型号:</span>
                <span style={{ color: '#334155' }}>{currentBox.spec}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>生产厂家:</span>
                <span style={{ color: '#334155', textAlign: 'right', flex: 1, marginLeft: '20px' }}>{currentBox.manufacturer}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>到货数量:</span>
                <span style={{ color: '#334155' }}>{currentBox.totalQty}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>进库数量:</span>
                <span style={{ color: '#334155' }}>0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>生产信息详情:</span>
                <span 
                  onClick={() => setShowProductionInfo(true)}
                  style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: '500' }}
                >
                  【查看详情】
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>不可入库数:</span>
                <span style={{ color: 'var(--accent)' }}>0</span>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: '600' }}>数量:</span>
                <input 
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  style={{ width: '60px', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}
                />
              </div>
              <div style={{ fontSize: '14px' }}>剩余上架 <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{currentBox.pendingQty}</span></div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             {skus.map(sku => (
               <div key={sku.code} style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                 <div 
                   onClick={() => setExpandedSku(expandedSku === sku.code ? null : sku.code)}
                   style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                 >
                   <div style={{ fontWeight: '600' }}>{sku.name} ({sku.code})</div>
                   <div style={{ color: '#94a3b8', transform: expandedSku === sku.code ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</div>
                 </div>
                 {expandedSku === sku.code && (
                   <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #f1f5f9' }}>
                     {boxes.filter(b => b.skuCode === sku.code).map((b, idx) => (
                       <div key={idx} style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                           <span style={{ color: '#64748b' }}>批号:</span>
                           <span style={{ fontWeight: '600' }}>{b.batchNo}</span>
                         </div>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                           <span style={{ color: '#64748b' }}>待入库:</span>
                           <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{b.pendingQty}</span>
                         </div>
                         <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                           <button style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid var(--accent)', color: 'var(--accent)', background: 'white', fontSize: '12px' }}>
                             到货差异
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             ))}
          </div>
        )}
      </div>
      
      <div style={{ padding: '16px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button 
          onClick={() => { setLocation(""); setQty(""); }}
          style={{ padding: '14px', borderRadius: '8px', border: 'none', background: '#cbd5e1', color: '#334155', fontWeight: '600' }}
        >
          清空重置
        </button>
        <button 
          onClick={onConfirm}
          style={{ padding: '14px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'white', fontWeight: '600' }}
        >
          确认上架
        </button>
      </div>

      {showProductionInfo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }} onClick={() => setShowProductionInfo(false)}></div>
          <div style={{ background: 'white', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '20px', maxHeight: '80%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'var(--accent)', padding: '12px 16px', borderRadius: '8px', color: 'white' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>批号 {currentBox.batchNo}</div>
              <div style={{ background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>必采</div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', padding: '0 4px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>生产日期</div>
                <div style={{ fontWeight: '600' }}>{currentBox.productionDate}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>有效期</div>
                <div style={{ fontWeight: '600' }}>{currentBox.expiryDate}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '16px' }}>溯源码列表</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>溯源码 {i}</div>
                    <div style={{ fontSize: '13px', color: '#334155', wordBreak: 'break-all', fontWeight: '500' }}>
                      8362221051859912436{i}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              onClick={() => setShowProductionInfo(false)}
              style={{ width: '100%', marginTop: '24px', padding: '14px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'white', fontWeight: '600' }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 8. Location Adjustment Component
const LocationAdjustment = ({ onBack }: { onBack: () => void }) => {
  const [currentLoc, setCurrentLoc] = useState("");
  const [selectedSku, setSelectedSku] = useState("");
  const [targetLoc, setTargetLoc] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [qty, setQty] = useState("7");

  const mockProducts = [
    { skuCode: "1080503025", skuName: "枇杷止咳颗粒", area: "不可售", location: "BM9999", status: "不可售库位", batches: ["S250118", "S250208"], availableQty: 7 },
    { skuCode: "1080503030", skuName: "感冒清热颗粒", area: "销售区", location: "A-01-01", status: "正常", batches: ["B241201"], availableQty: 100 }
  ];

  const selectedProduct = mockProducts.find(p => p.skuName === selectedSku);

  const handleReset = () => {
    setCurrentLoc("");
    setSelectedSku("");
    setTargetLoc("");
    setBatchNo("");
    setQty("0");
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: 'white', padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', fontSize: '20px' }}>←</button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>货位调整</div>
        <div style={{ width: '24px' }}></div>
      </div>

      <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
        {/* Current Product Info Section */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#334155' }}>
            当前商品信息 <span style={{ color: '#ef4444' }}>*</span>
          </div>
          
          {/* Location Input */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input 
              value={currentLoc}
              onChange={(e) => setCurrentLoc(e.target.value)}
              placeholder="请扫描或输入货位编号*" 
              style={{ width: '100%', padding: '12px', paddingRight: '44px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }}
            />
            <div 
              onClick={() => setCurrentLoc("BM9999")}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px' }}>
              <IconScan size={18} />
            </div>
          </div>

          {/* Product Select/Scan */}
          <div style={{ position: 'relative', marginBottom: selectedProduct ? '16px' : '0' }}>
            <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
              <select 
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                style={{ flex: 1, padding: '12px', border: 'none', outline: 'none', background: 'white', fontSize: '14px', appearance: 'none' }}
              >
                <option value="">请选择或扫描商品条码</option>
                {mockProducts.map(p => <option key={p.skuCode} value={p.skuName}>{p.skuName}</option>)}
              </select>
              <div 
                onClick={() => setSelectedSku("枇杷止咳颗粒")}
                style={{ background: 'white', display: 'flex', alignItems: 'center', padding: '0 12px', borderLeft: '1px solid #e2e8f0', color: '#94a3b8', cursor: 'pointer' }}>
                <IconChevronDown size={20} />
              </div>
            </div>
          </div>

          {/* Product Details (View 2) */}
          {selectedProduct && (
            <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', fontSize: '14px', color: '#64748b' }}>
              <div style={{ display: 'flex', marginBottom: '10px' }}>
                <span style={{ width: '80px' }}>商品名称：</span>
                <span style={{ color: '#1e293b', fontWeight: 'bold' }}>{selectedProduct.skuName}</span>
              </div>
              <div style={{ display: 'flex', marginBottom: '10px' }}>
                <span style={{ width: '80px' }}>库区：</span>
                <span style={{ color: '#1e293b' }}>{selectedProduct.area}</span>
              </div>
              <div style={{ display: 'flex', marginBottom: '10px' }}>
                <span style={{ width: '80px' }}>库位：</span>
                <span style={{ color: '#1e293b' }}>{selectedProduct.location}</span>
              </div>
              <div style={{ display: 'flex', marginBottom: '10px' }}>
                <span style={{ width: '80px' }}>库位状态：</span>
                <span style={{ color: '#1e293b' }}>{selectedProduct.status}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '80px' }}>商品批号：</span>
                <span style={{ color: '#1e293b', fontWeight: 'bold' }}>{selectedProduct.batches.join('、')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Target Location Section */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#334155' }}>
            选择调整目标货位 <span style={{ color: '#ef4444' }}>*</span>
          </div>

          {/* Target Location Input */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input 
              value={targetLoc}
              onChange={(e) => setTargetLoc(e.target.value)}
              placeholder="请扫描或输入目标库位" 
              style={{ width: '100%', padding: '12px', paddingRight: '44px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }}
            />
            <div 
              onClick={() => setTargetLoc("A-02-02")}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px' }}>
              <IconScan size={18} />
            </div>
          </div>

          {/* Batch Select */}
          <div style={{ position: 'relative', marginBottom: selectedProduct ? '20px' : '0' }}>
            <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
              <select 
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                style={{ flex: 1, padding: '12px', border: 'none', outline: 'none', background: 'white', fontSize: '14px', appearance: 'none' }}
              >
                <option value="">请选择移入商品批次号</option>
                {selectedProduct?.batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <div style={{ background: 'white', display: 'flex', alignItems: 'center', padding: '0 12px', color: '#94a3b8', pointerEvents: 'none' }}>
                <IconChevronDown size={20} />
              </div>
            </div>
          </div>

          {/* Quantity Input (View 2) */}
          {selectedProduct && (
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>数量:</span>
                <input 
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  style={{ width: '60px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontSize: '14px' }}
                />
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>
                可调整数量 <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{selectedProduct.availableQty}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Buttons */}
      <div style={{ padding: '16px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
        <button 
          onClick={handleReset}
          style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', background: '#cbd5e1', color: '#334155', fontWeight: '600', fontSize: '16px' }}
        >
          清空重置
        </button>
        <button 
          onClick={() => {
            alert("调整成功");
            onBack();
          }}
          style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', background: '#007bff', color: 'white', fontWeight: '600', fontSize: '16px' }}
        >
          确认调整
        </button>
      </div>
    </div>
  );
};

// 9. Inventory Query Component
const InventoryQuery = ({ onBack }: { onBack: () => void }) => {
  const [locationCode, setLocationCode] = useState("");
  const [skuInfo, setSkuInfo] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (!locationCode && !skuInfo && !batchNo) {
      alert("请至少输入一个查询条件");
      return;
    }
    
    setHasSearched(true);
    setResults([
      {
        skuCode: "1010301416",
        skuName: "葛根汤颗粒",
        spec: "6克*6袋",
        manufacturer: "瑞阳制药股份有限公司(原瑞阳制药有限公司)",
        expiryDate: "2028-12-12",
        location: "FC9999",
        batchNo: "25121321",
        availableQty: 0,
        reservedQty: 0,
        unselectableQty: 114
      }
    ]);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: 'white', padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', display: 'flex', alignItems: 'center' }}>
          <IconChevronLeft />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>库存查询</div>
        <div style={{ width: '24px' }}></div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {!hasSearched ? (
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {/* Location Input */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8f9fa', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <IconWarehouse color="#94a3b8" />
              <input 
                value={locationCode}
                onChange={(e) => { 
                  const val = e.target.value;
                  setLocationCode(val); 
                  if(val) { setSkuInfo(""); setBatchNo(""); } 
                }}
                placeholder="请扫描或输入货位编码" 
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', marginLeft: '12px', fontSize: '15px' }}
              />
              <div 
                onClick={() => { setLocationCode("FC9999"); setSkuInfo(""); setBatchNo(""); }}
                style={{ color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px', marginLeft: '8px', cursor: 'pointer' }}>
                <IconScan size={18} />
              </div>
            </div>

            {/* SKU Input */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8f9fa', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <IconBarcode color="#94a3b8" />
              <input 
                value={skuInfo}
                onChange={(e) => { 
                  const val = e.target.value;
                  setSkuInfo(val); 
                  if(val) { setLocationCode(""); setBatchNo(""); } 
                }}
                placeholder="请输入商品编码/名称或扫描69码" 
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', marginLeft: '12px', fontSize: '15px' }}
              />
              <div 
                onClick={() => { setSkuInfo("1010301416"); setLocationCode(""); setBatchNo(""); }}
                style={{ color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px', marginLeft: '8px', cursor: 'pointer' }}>
                <IconScan size={18} />
              </div>
            </div>

            {/* Batch Input */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8f9fa', borderRadius: '8px', padding: '12px' }}>
              <IconFileText color="#94a3b8" />
              <input 
                value={batchNo}
                onChange={(e) => { 
                  const val = e.target.value;
                  setBatchNo(val); 
                  if(val) { setLocationCode(""); setSkuInfo(""); } 
                }}
                placeholder="请输入批号" 
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', marginLeft: '12px', fontSize: '15px' }}
              />
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>数量: {results.length}条</div>
            {results.map((item, idx) => (
              <div key={idx} style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>商品编码: {item.skuCode}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#1e293b' }}>{item.skuName}</div>
                
                <div style={{ display: 'flex', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#64748b', width: '60px' }}>规格:</span>
                  <span style={{ color: '#1e293b' }}>{item.spec}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#64748b', width: '60px' }}>厂家:</span>
                  <span style={{ color: '#1e293b', flex: 1 }}>{item.manufacturer}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '12px', fontSize: '14px' }}>
                  <span style={{ color: '#64748b', width: '60px' }}>近:</span>
                  <span style={{ color: '#1e293b' }}>{item.expiryDate}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderTop: '1px dashed #f1f5f9', paddingTop: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>货位: </span>
                    <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>{item.location}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>批号: </span>
                    <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>{item.batchNo}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1, background: '#e0f2fe', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#0369a1', marginBottom: '4px' }}>可用库存</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0369a1' }}>{item.availableQty}</div>
                  </div>
                  <div style={{ flex: 1, background: '#fefce8', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#a16207', marginBottom: '4px' }}>预占库存</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#a16207' }}>{item.reservedQty}</div>
                  </div>
                  <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#334155', marginBottom: '4px' }}>不可销售</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155' }}>{item.unselectableQty}</div>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '20px', marginBottom: '20px' }}>已经到底了</div>
          </div>
        )}
      </div>

      {/* Footer Button */}
      {!hasSearched && (
        <div style={{ padding: '16px', background: 'white', borderTop: '1px solid #e2e8f0' }}>
          <button 
            onClick={handleSearch}
            style={{ 
              width: '100%', 
              padding: '14px', 
              borderRadius: '8px', 
              border: 'none', 
              background: '#007bff', 
              color: 'white', 
              fontWeight: '600', 
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <IconSearch size={20} />
            查询库存
          </button>
        </div>
      )}
    </div>
  );
};

// 10. Settings Component
const Settings = ({ onBack }: { onBack: () => void }) => {
  const [isTraceEnabled, setIsTraceEnabled] = useState(true);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: 'white', padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', display: 'flex', alignItems: 'center' }}>
          <IconChevronLeft />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>系统设置</div>
        <div style={{ width: '24px' }}></div>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, paddingRight: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}>移库溯源码校验</div>
            <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              关闭后，移库至不合格库不再扫追溯码，后续无法记录不合格库中的商品追溯码信息
            </div>
          </div>
          <div 
            onClick={() => setIsTraceEnabled(!isTraceEnabled)}
            style={{ 
              width: '50px', 
              height: '28px', 
              borderRadius: '14px', 
              background: isTraceEnabled ? '#007bff' : '#e2e8f0', 
              position: 'relative', 
              cursor: 'pointer',
              transition: 'background 0.2s',
              marginTop: '4px'
            }}
          >
            <div style={{ 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%', 
              background: 'white', 
              position: 'absolute', 
              top: '2px', 
              left: isTraceEnabled ? '24px' : '2px',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. Main App Controller
const App = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [tasks, setTasks] = useState<PickingTask[]>(MOCK_TASKS);
  const [selectedTask, setSelectedTask] = useState<PickingTask | null>(null);
  
  const [selectedInboundOrder, setSelectedInboundOrder] = useState<InboundOrder | null>(null);
  const [selectedInboundBox, setSelectedInboundBox] = useState<InboundBox | null>(null);

  const handleTaskSelect = (task: PickingTask) => {
    setSelectedTask(task);
    setCurrentView('taskDetail');
  };

  const handleTaskComplete = () => {
    if (selectedTask) {
      setTasks(prev => prev.map(t => {
        if (t.taskId === selectedTask.taskId) {
          return {
            ...t,
            items: t.items.map(item => ({ ...item, status: 'COMPLETED', confirmedBoxQty: item.planQty }))
          };
        }
        return t;
      }));
    }
    setSelectedTask(null);
    setCurrentView('taskList');
  };

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', overflowX: 'hidden' }}>
      {currentView === 'dashboard' && <Dashboard tasks={tasks} onNavigate={setCurrentView} />}
      {currentView === 'taskList' && <TaskList tasks={tasks} onSelectTask={handleTaskSelect} onBack={() => setCurrentView('dashboard')} />}
      {currentView === 'taskDetail' && selectedTask && (
        <TaskDetail 
          task={selectedTask} 
          onBack={() => setCurrentView('taskList')} 
          onComplete={handleTaskComplete}
        />
      )}
      
      {currentView === 'inboundSearch' && (
        <InboundSearch 
          onQueryDetails={(order) => { setSelectedInboundOrder(order); setCurrentView('boxDetail'); }} 
          onBack={() => setCurrentView('dashboard')} 
        />
      )}
      
      {currentView === 'boxDetail' && (
        <BoxDetail 
          boxes={MOCK_INBOUND_BOXES} 
          onPutaway={(selectedBoxes) => { setSelectedInboundBox(selectedBoxes[0]); setCurrentView('putaway'); }} 
          onCrossDock={() => setCurrentView('dashboard')} 
          onBack={() => setCurrentView('inboundSearch')} 
        />
      )}
      
      {currentView === 'putaway' && selectedInboundBox && (
        <Putaway 
          boxes={MOCK_INBOUND_BOXES} 
          onConfirm={() => setCurrentView('dashboard')} 
          onBack={() => setCurrentView('boxDetail')} 
        />
      )}
      
      {currentView === 'locationAdjustment' && (
        <LocationAdjustment onBack={() => setCurrentView('dashboard')} />
      )}
      
      {currentView === 'inventoryQuery' && (
        <InventoryQuery onBack={() => setCurrentView('dashboard')} />
      )}

      {currentView === 'settings' && (
        <Settings onBack={() => setCurrentView('dashboard')} />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);