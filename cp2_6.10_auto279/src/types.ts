export type TemplateType = 'dot' | 'grid' | 'line' | 'blank';
export type BindingType = 'saddle' | 'perfect' | 'coil';
export type OrderStatus = 'pending' | 'producing' | 'completed';

export interface TemplateConfig {
  templateType: TemplateType;
  gridColor: string;
  gridDensity: number;
  paperColor: string;
  bindingType: BindingType;
}

export interface Order {
  id: string;
  customerName: string;
  config: TemplateConfig;
  configSummary: string;
  status: OrderStatus;
  rejectReason?: string;
  createdAt: string;
}

export interface Snapshot {
  id: string;
  timestamp: string;
  config: TemplateConfig;
  summary: string;
}

export interface AppState {
  config: TemplateConfig;
  orders: Order[];
  selectedOrderIds: string[];
  snapshots: Snapshot[];
  isRestoring: boolean;
  showAcceptAnimation: string | null;
  showRejectShake: string | null;
  exportProgress: number;
  showExportSuccess: boolean;
  bindingLabelVisible: boolean;
}

export type AppAction =
  | { type: 'SET_CONFIG'; payload: Partial<TemplateConfig> }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'TOGGLE_ORDER_SELECT'; payload: string }
  | { type: 'SET_SNAPSHOTS'; payload: Snapshot[] }
  | { type: 'ADD_SNAPSHOT'; payload: Snapshot }
  | { type: 'SET_RESTORING'; payload: boolean }
  | { type: 'SHOW_ACCEPT_ANIMATION'; payload: string | null }
  | { type: 'SHOW_REJECT_SHAKE'; payload: string | null }
  | { type: 'SET_EXPORT_PROGRESS'; payload: number }
  | { type: 'SET_EXPORT_SUCCESS'; payload: boolean }
  | { type: 'SET_BINDING_LABEL_VISIBLE'; payload: boolean }
  | { type: 'RESTORE_CONFIG'; payload: TemplateConfig };
