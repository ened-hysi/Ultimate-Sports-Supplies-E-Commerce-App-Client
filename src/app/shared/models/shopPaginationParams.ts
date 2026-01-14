export class ShopPaginationParams{
    brands: string[] = [];
    types: string[] = [];
    sort: string = 'name';
    pageNumber = 1;
    entitiesPerPage = 10;
    search: string = '';
}