# Backend Information

This document provides a summary of the backend application, including database entities and API endpoints.

## Entities

### Address
- `Id` (int, Key)
- `Country` (string)
- `City` (string)
- `PostalCode` (string)
- `Street` (string)
- `Building` (string)
- `Premises` (string?)

### Category
- `Id` (int, Key)
- `Name` (string)
- `Description` (string?)

### Client
- `Id` (int, Key)
- `Name` (string)
- `TaxId` (string?)
- `Type` (ClientType)
- `Email` (string)
- `PhoneNumber` (string)
- `AddressId` (int, FK)
- `Address` (Address, Navigation)

### DeliveryCompany
- `Id` (int, Key)
- `Name` (string)
- `Email` (string)
- `PhoneNumber` (string)
- `IsActive` (bool)
- `AddressId` (int, FK)
- `Address` (Address, Navigation)

### Parcel
- `Id` (int, Key)
- `Description` (string)
- `Weight` (decimal)
- `Length` (decimal)
- `Width` (decimal)
- `Height` (decimal)
- `ShipmentId` (int?, FK)
- `Shipment` (Shipment?, Navigation)
- `ParcelProducts` (ICollection<ParcelProduct>)

### Product
- `Id` (int, Key)
- `SKU` (string)
- `Name` (string)
- `Description` (string)
- `Price` (decimal)
- `DefectDescription` (string?)
- `Defective` (bool)
- `IsActive` (bool)
- `CategoryId` (int, FK)
- `TaxRateId` (int, FK)
- `Category` (Category, Navigation)
- `TaxRate` (TaxRate, Navigation)
- `WarehouseProducts` (ICollection<WarehouseProduct>)
- `ParcelProducts` (ICollection<ParcelProduct>)

### SalesDocument
- `Id` (int, Key)
- `DocumentType` (SalesDocumentType)
- `IssueDate` (DateTimeOffset)
- `Description` (string?)
- `DocumentNumber` (string)
- `TotalNet` (decimal)
- `TotalTax` (decimal)
- `TotalGross` (decimal)
- `ClientId` (int?, FK)
- `Client` (Client?, Navigation)
- `Items` (ICollection<SalesDocumentItem>)
- `Payments` (ICollection<SalesPayment>)

### SalesDocumentItem
- `Id` (int, Key)
- `ProductName` (string)
- `ProductSKU` (string)
- `UnitPriceNet` (decimal)
- `LineNet` (decimal)
- `LineTax` (decimal)
- `LineGross` (decimal)
- `Quantity` (int)
- `SalesDocumentId` (int, FK)
- `ProductId` (int, FK)
- `TaxRateId` (int, FK)
- `SalesDocument` (SalesDocument, Navigation)
- `Product` (Product, Navigation)
- `TaxRate` (TaxRate, Navigation)

### SalesPayment
- `Id` (int, Key)
- `Amount` (decimal)
- `PaymentOption` (PaymentOption)
- `SalesDocumentId` (int, FK)
- `SalesDocument` (SalesDocument, Navigation)

### Shipment
- `Id` (int, Key)
- `Type` (ShipmentType)
- `Status` (ShipmentStatus)
- `SendDate` (DateTimeOffset)
- `DeliveryDate` (DateTimeOffset?)
- `DeliveryCompanyId` (int, FK)
- `AddressSenderId` (int, FK)
- `AddressReceiverId` (int, FK)
- `DeliveryCompany` (DeliveryCompany, Navigation)
- `AddressSender` (Address, Navigation)
- `AddressReceiver` (Address, Navigation)
- `Parcels` (ICollection<Parcel>)

### TaxRate
- `Id` (int, Key)
- `Code` (string)
- `Rate` (decimal)
- `IsActive` (bool)

### User
- `Id` (int, Key)
- `FirstName` (string)
- `LastName` (string)
- `Email` (string)
- `PhoneNumber` (string)
- `DateOfBirth` (DateTime)
- `Role` (UserRole)
- `AddressId` (int, FK)
- `Address` (Address, Navigation)
- `Credentials` (UserCredential, Navigation)
- `RefreshTokens` (ICollection<RefreshToken>)

### Warehouse
- `Id` (int, Key)
- `Name` (string)
- `AddressId` (int, FK)
- `Address` (Address, Navigation)
- `WarehouseProducts` (ICollection<WarehouseProduct>)

## API Endpoints

### AddressesController (`/api/Addresses`)
- `POST /` - Create Address
- `GET /{id}` - Get Address by ID
- `GET /` - Get all Addresses (paginated)
- `PUT /{id}` - Update Address
- `GET /exists` - Check Address Existence

### AuthController (`/api/Auth`)
- `POST /register` - Register User
- `POST /login` - Login
- `POST /refresh` - Refresh Token
- `POST /change-password` - Change Password

### CategoriesController (`/api/Categories`)
- `POST /` - Create Category
- `GET /{id}` - Get Category by ID
- `GET /` - Get all Categories (paginated)
- `PUT /{id}` - Update Category
- `DELETE /{id}` - Delete Category

### ClientsController (`/api/Clients`)
- `POST /` - Create Client
- `GET /{id}` - Get Client by ID
- `GET /` - Get all Clients (filters and paginated)
- `PUT /{id}` - Update Client
- `DELETE /{id}` - Delete Client

### DeliveryCompaniesController (`/api/DeliveryCompanies`)
- `POST /` - Create Delivery Company
- `GET /{id}` - Get Delivery Company by ID
- `GET /` - Get all Delivery Companies (paginated and filter)
- `PUT /{id}` - Update Delivery Company
- `DELETE /{id}` - Deactivate Delivery Company
- `POST /{id}/restore` - Restore Delivery Company

### ParcelsController (`/api/Parcels`)
- `POST /` - Create Parcel
- `GET /{id}` - Get Parcel by ID
- `GET /` - Get all Parcels (pagination & filters)
- `PUT /{id}` - Update Parcel
- `DELETE /{id}` - Delete Parcel
- `GET /{id}/products` - Get Products inside a Parcel (pagination)
- `POST /{id}/products` - Add Product to Parcel
- `DELETE /{id}/products` - Remove Product from Parcel

### ProductsController (`/api/Products`)
- `POST /` - Create Product
- `GET /{id}` - Get Product by ID
- `GET /` - Get all Products (pagination and filters)
- `PUT /{id}` - Update Product
- `DELETE /{id}` - Deactivate Product
- `POST /{id}/restore` - Restore Product

### SalesDocumentController (`/api/SalesDocument`)
- `POST /` - Create Sales Document
- `GET /` - Get Sales Documents (pagination and filters)
- `GET /{id}` - Get Sales Document by ID
- `PUT /{id}` - Update Sales Document Header

### SalesDocumentItemController (`/api/SalesDocuments/{salesDocumentId}/items`)
- `GET /` - Get Sales Document Items by Document
- `GET /{id}` - Get Sales Document Item by ID
- `POST /` - Create Sales Document Item

### SalesPaymentController (`/api/SalesDocuments/{salesDocumentId}/payments`)
- `GET /` - Get all Payments for a Document
- `POST /` - Create Payment

### ShipmentController (`/api/Shipments`)
- `GET /` - Get all Shipments (pagination & filters)
- `GET /{id}` - Get Shipment by ID
- `GET /{id}/parcels` - Get Parcels of Shipment
- `POST /` - Create Shipment
- `PUT /{id}` - Update Shipment
- `PATCH /{id}/status` - Update Status Only
- `POST /{id}/parcels` - Add Parcels to Shipment
- `DELETE /{id}/parcels` - Remove Parcels from Shipment
- `DELETE /{id}` - Delete Shipment

### TaxRateController (`/api/TaxRates`)
- `GET /` - Get all Tax Rates
- `GET /{id}` - Get Tax Rate by ID
- `POST /` - Create Tax Rate
- `PUT /{id}` - Update Tax Rate
- `PATCH /{id}/active` - Set Active Status

### UsersController (`/api/User`)
- `GET /` - Get all Users (paginated and filtered)
- `GET /{id}` - Get User by ID
- `PUT /{id}` - Update User
- `DELETE /{id}` - Deactivate User
- `PUT /{id}/activate` - Activate User

### WarehouseController (`/api/Warehouse`)
- `POST /` - Create Warehouse
- `GET /{id}` - Get Warehouse by ID
- `GET /` - Get all Warehouses
- `PUT /{id}` - Update Warehouse
- `DELETE /{id}` - Delete Warehouse
- `GET /{warehouseId}/products/{productId}` - Get Product by ID from Warehouse
- `GET /{warehouseId}/products` - Get Products from Warehouse
- `POST /{warehouseId}/products` - Add Product to Warehouse
- `DELETE /{warehouseId}/products` - Remove Product from Warehouse
