
export enum Genre {
  XIANXIA = 'Tiên Hiệp (Tu Chân)',
  WUXIA = 'Kiếm Hiệp (Giang Hồ)',
  HISTORY = 'Lịch Sử / Dã Sử',
  MILITARY = 'Quân Sự / Chiến Tranh',
  FANTASY = 'Huyền Huyễn (Dị Giới)',
  MODERN = 'Đô Thị / Dị Năng'
}

export enum AuthorStyle {
  VONG_NGU = 'Vong Ngữ (Logic, Lạnh lùng, Thế giới tàn khốc)',
  DUONG_TAM = 'Đường Tam (Nhiệt huyết, Tình cảm, Hào hùng)',
  TIEU_DINH = 'Tiêu Đỉnh (Bi tráng, Văn phong hoa mỹ, Nội tâm)',
  CAO_NGUYET = 'Cao Nguyệt (Đế vương, Mưu quyền, Lịch sử hào hùng)',
  LAO_TRU = 'Lão Trư (Hài hước châm biếm, Chiến tranh tàn khốc)',
  KIM_DUNG = 'Kim Dung (Cổ điển, Triết lý, Võ học tinh tế)',
  MUC_NGHE = 'Mực Nghệ (Cầu trường sinh, Quỷ dị, Nhân sinh quan)',
  NEUTRAL = 'Văn Phong Đại Tác Giả (Tiêu chuẩn, Mượt mà)'
}

export enum ActionType {
  PLANNING = 'Kiến Trúc Đại Cương (1000+ Chương)',
  REWRITE = 'Nhuận Sắc (Viết lại hay hơn)',
  EXPAND = 'Phát Triển (Mở rộng tình tiết)',
  SUMMARIZE = 'Tóm Tắt (Cô đọng ý chính)',
  CRITIQUE = 'Phê Bình & Góp Ý (Góc nhìn Biên tập viên)',
  SCENE_CRAFTING = 'Dựng Cảnh (Tả cảnh ngụ tình)'
}

export enum ContentLength {
  SHORT = 'Ngắn (Khoảng 1500 chữ)',
  MEDIUM = 'Tiêu Chuẩn (Khoảng 2500 chữ)',
  LONG = 'Đại Chương (3000+ chữ)',
  VERY_LONG = 'Siêu Đại Chương (4000+ chữ)',
  EPIC = 'Vạn Tự Chương (5000+ chữ)'
}

export enum Pacing {
  FAST = 'Nhanh (Hành động dồn dập)',
  MODERATE = 'Vừa phải (Cân bằng)',
  SLOW = 'Chậm rãi (Chi tiết, Sâu sắc)'
}

export enum ReasoningMode {
  LOGIC = 'Logic Cốt Truyện (Ưu tiên mạch lạc, chặt chẽ)',
  CREATIVE = 'Văn Phong Bay Bổng (Ưu tiên từ ngữ, cảm xúc)',
  BALANCED = 'Cân Bằng (Tiêu chuẩn)'
}

export type AIModel = 'gemini-2.5-flash' | 'gemini-3-pro-preview';

export interface GenerationConfig {
  genre: Genre;
  authorStyle: AuthorStyle;
  creativity: number; // 0.0 - 1.0 (Temperature)
  action: ActionType;
  
  // Gemini 2.5 Config
  useDeepThinking: boolean; 
  thinkingBudget: number;
  
  // Gemini 3.0 Config
  reasoningMode: ReasoningMode; // New mode for 3.0

  length: ContentLength;
  pacing: Pacing;
  model: AIModel;
  previousEnding: string; // The text of the previous chapter's ending
  outline: string; 
  worldSettings: string; 
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  isError?: boolean;
}