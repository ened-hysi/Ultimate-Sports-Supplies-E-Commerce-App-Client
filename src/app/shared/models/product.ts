import { ProductPicture } from "./productPicture";

export type Product = {
    id: number;
    name: string;
    description: string;
    price: number;
    productPictures: ProductPicture[];
    type: string;
    brand: string;
    stockLevel: number;
}