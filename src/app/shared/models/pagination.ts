export type Pagination<T> = {
   pageNumber: number;
   entitiesPerPage: number;
   totalEntities: number;
   data: T[]
}