export interface Product {
    id: string;
    title: string;
    description: string | null;
    price: number;
}

export interface Stock {
    product_id: string;
    count: number;
}

export interface ProductWithStock extends Product {
    stock: number;
}