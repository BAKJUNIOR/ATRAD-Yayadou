/** Page d'une liste paginée (`PaginationResponse` du backend) ; `currentPage` commence à 0. */
export interface PaginationResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
}
