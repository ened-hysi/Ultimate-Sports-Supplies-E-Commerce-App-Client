import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Product } from '../../shared/models/product';
import { ShopPaginationParams } from '../../shared/models/shopPaginationParams'
import { Pagination } from '../../shared/models/pagination';

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  baseUrl = 'https://localhost:5001/api/'
  private http = inject(HttpClient);
  types: string[] = [];
  brands: string[] = [];

  getProducts(shopPaginationParams: ShopPaginationParams) {
    let params = new HttpParams();

    if (shopPaginationParams.brands.length > 0){
      shopPaginationParams.brands.forEach(brand => {
         params = params.append('brands', brand);
      })
    }

    if (shopPaginationParams.types.length > 0){
      shopPaginationParams.types.forEach(type => {
        params = params.append('types', type);
      })
    }

    if (shopPaginationParams.sort) {
      params = params.append('sort',shopPaginationParams.sort);
    }

    if (shopPaginationParams.search){
      params = params.append('search', shopPaginationParams.search);
    }

    params = params.append('entitiesPerPage', shopPaginationParams.entitiesPerPage);
    params = params.append('pageNumber', shopPaginationParams.pageNumber);

    return this.http.get<Pagination<Product>>(this.baseUrl + 'products', {params});
  }


  getProduct(id: number) {
    return this.http.get<Product>(this.baseUrl + 'products/' + id);
  }

  getBrands(){
    if (this.brands.length > 0) return;
    return this.http.get<string[]>(this.baseUrl + 'products/brands').subscribe({
      next: response => this.brands = response
    })
  }

  getTypes(){
    if (this.types.length > 0) return;
    return this.http.get<string[]>(this.baseUrl + 'products/types').subscribe({
      next: response => this.types = response
    })
  }
  
}
