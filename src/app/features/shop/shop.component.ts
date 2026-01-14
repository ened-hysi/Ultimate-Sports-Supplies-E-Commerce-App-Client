import { Component, inject, OnInit } from '@angular/core';
import { ShopService } from '../../core/services/shop.service';
import { Product } from '../../shared/models/product';
import { MatCard } from '@angular/material/card';
import { ProductItemComponent } from './product-item/product-item.component';
import { MatDialog } from '@angular/material/dialog';
import { FiltersDialogComponent } from './filters-dialog/filters-dialog.component';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu'
import { MatListOption, MatSelectionList, MatSelectionListChange } from '@angular/material/list';
import { ShopPaginationParams } from '../../shared/models/shopPaginationParams';
import { MatPaginator, PageEvent } from '@angular/material/paginator'
import { Pagination } from '../../shared/models/pagination';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from "@angular/material/button";

@Component({
  selector: 'app-shop',
  imports: [
    MatCard,
    ProductItemComponent,
    MatButton,
    MatIcon,
    MatMenu,
    MatSelectionList,
    MatListOption,
    MatMenuTrigger,
    MatPaginator,
    FormsModule,
    MatIconButton
],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.scss'
})
export class ShopComponent implements OnInit{

  private shopService = inject(ShopService);
  private dialogService = inject(MatDialog);
  products?: Pagination<Product>;
  sortOptions = [
    {name: 'Alphabetical', value: 'name'},
    {name: 'Price: Low-High', value: 'priceAsc'},
    {name: 'Price: High-Low', value: 'priceDesc'},
    {name: 'Age: Newest-Oldest', value: 'ageDesc'},
    {name: 'Age: Oldest-Newest', value: 'ageAsc'}
  ]

  shopPaginationParams = new ShopPaginationParams();
  pageSizeOptions = [5,10,15,20]

  ngOnInit(): void {
    this.initializeShop();
  }

  initializeShop() {
    this.shopService.getBrands();
    this.shopService.getTypes();
    this.getProducts();
  }

  getProducts(){
    this.shopService.getProducts(this.shopPaginationParams).subscribe({
      next: response => this.products = response,
      error: error => console.log(error)
    })
  }

  onSearchChange() {
    this.shopPaginationParams.pageNumber = 1;
    this.getProducts();
  }

  handlePageEvent(event: PageEvent){
    this.shopPaginationParams.pageNumber = event.pageIndex + 1;
    this.shopPaginationParams.entitiesPerPage = event.pageSize;
    this.getProducts();
  }

  onSortChange(event: MatSelectionListChange) {
    const selectedOption = event.options[0];
    if (selectedOption) {
      this.shopPaginationParams.sort = selectedOption.value;
      this.shopPaginationParams.pageNumber = 1;
      this.getProducts();
    }
  }

  openFiltersDialog() {
     const dialogRef = this.dialogService.open(FiltersDialogComponent , {
      minWidth:'500px',
      data: {
        selectedBrands: this.shopPaginationParams.brands,
        selectedTypes: this.shopPaginationParams.types
      }
     });
     dialogRef.afterClosed().subscribe({
      next: result => {
        if (result){
          this.shopPaginationParams.brands = result.selectedBrands;
          this.shopPaginationParams.types = result.selectedTypes;
          this.shopPaginationParams.pageNumber = 1;
          this.getProducts();
        }
      }
     })
  }
}
