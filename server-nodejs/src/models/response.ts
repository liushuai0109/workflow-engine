export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: any;
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}
