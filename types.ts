export enum MessageStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  READY = 'READY',
  SENT = 'SENT',
  FAILED = 'FAILED'
}

export enum ResponseStatus {
  PENDING = 'PENDING',
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  NO_REPLY = 'NO_REPLY',
  UNKNOWN = 'UNKNOWN' // Default before sending
}

export interface Pharmacy {
  id: string;
  name: string;
  phone: string;
  status: MessageStatus;
  responseStatus: ResponseStatus;
  message: string;
  notes?: string;
  lastUpdated: number;
}

export interface InquiryConfig {
  productName: string;
  additionalNotes: string;
  tone: 'professional' | 'casual' | 'urgent';
}

export interface GeneratedMessageResponse {
  message: string;
}