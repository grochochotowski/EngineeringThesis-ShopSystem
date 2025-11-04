using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Controllers
{
    public interface IWarehouseService
    {
        Task<GetWarehouseDto> CreateAsync(CreateWarehouseDto dto, CancellationToken ct = default);
        Task<GetWarehouseDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<PagedResult<GetWarehouseDto>> GetAllAsync(PaginationParams pagination, string? search = null, CancellationToken ct = default);
        Task<bool> UpdateAsync(int id, UpdateWarehouseDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);

        Task<GetWarehouseProductItemDto?> GetProductByIdAsync(int productId, int warehouseId, CancellationToken ct = default);
        Task<PagedResult<GetWarehouseProductItemDto>> GetProductsFromWarehouseAsync(int warehouseId, PaginationParams pagination, string? search = null, CancellationToken ct = default);
        Task AddProductToWarehouseAsync(int warehouseId, AddProductToWarehouseDto dto, CancellationToken ct = default);
        Task RemoveProductFromWarehouseAsync(int warehouseId, RemoveProductFromWarehouseDto dto, CancellationToken ct = default);
    }

    public class WarehouseService : IWarehouseService
    {
        private readonly AppDbContext _db;
        private readonly IAddressService _addressService;

        public WarehouseService(AppDbContext db, IAddressService addressService)
        {
            _db = db;
            _addressService = addressService;
        }

        // --- CREATE WAREHOUSE ---
        public async Task<GetWarehouseDto> CreateAsync(CreateWarehouseDto dto, CancellationToken ct = default)
        {
            if (dto.Address is null)
                throw new ArgumentException("Address must be provided.");

            var (exists, _) = await _addressService.AddressExistsAsync(new AddressExistenceDto
            {
                Country = dto.Address.Country,
                City = dto.Address.City,
                Street = dto.Address.Street,
                Building = dto.Address.Building,
                Premises = dto.Address.Premises,
                PostalCode = dto.Address.PostalCode
            }, ct);

            if (exists)
                throw new InvalidOperationException("Provided address already exists.");

            var createdAddress = await _addressService.CreateAsync(dto.Address, ct);

            var entity = new Warehouse
            {
                Name = dto.Name.Trim(),
                AddressId = createdAddress.Id
            };

            _db.Warehouses.Add(entity);
            await _db.SaveChangesAsync(ct);

            return new GetWarehouseDto
            {
                Id = entity.Id,
                Name = entity.Name,
                AddressId = entity.AddressId
            };
        }

        // --- GET WAREHOUSE BY ID ---
        public async Task<GetWarehouseDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            return await _db.Warehouses
                .Where(w => w.Id == id)
                .Select(w => new GetWarehouseDto
                {
                    Id = w.Id,
                    Name = w.Name,
                    AddressId = w.AddressId
                })
                .FirstOrDefaultAsync(ct);
        }

        // --- GET ALL WAREHOUSES (paginated and filters) ---
        public async Task<PagedResult<GetWarehouseDto>> GetAllAsync(PaginationParams pagination, string? search = null, CancellationToken ct = default)
        {
            var query = _db.Warehouses
                .AsNoTracking()
                .OrderBy(w => w.Name)
                .Select(w => new GetWarehouseDto
                {
                    Id = w.Id,
                    Name = w.Name,
                    AddressId = w.AddressId
                });

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalized = search.Trim().ToLower();
                query = query.Where(w => w.Name.ToLower().Contains(normalized));
            }

            return await query.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
        }

        // --- UPDATE WAREHOUSE ---
        public async Task<bool> UpdateAsync(int id, UpdateWarehouseDto dto, CancellationToken ct = default)
        {
            var w = await _db.Warehouses.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (w is null) return false;

            var addrExists = await _db.Addresses.AnyAsync(a => a.Id == dto.AddressId, ct);
            if (!addrExists) throw new ArgumentException("AddressId not found.");

            w.Name = dto.Name.Trim();
            w.AddressId = dto.AddressId;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- DELETE WAREHOUSE ---
        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var w = await _db.Warehouses
                .Include(x => x.WarehouseProducts)
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            if (w is null)
                return false;

            var hasProducts = w.WarehouseProducts.Any();
            if (hasProducts)
                throw new InvalidOperationException("Cannot delete warehouse that still contains products.");

            _db.Warehouses.Remove(w);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- GET PRODUCT BY ID FROM WAREHOUSE ---
        public async Task<GetWarehouseProductItemDto> GetProductByIdAsync(int productId, int warehouseId, CancellationToken ct = default)
        {
            var item = await _db.WarehouseProducts
                .Where(x => x.WarehouseId == warehouseId && x.ProductId == productId)
                .Select(x => new GetWarehouseProductItemDto
                {
                    ProductId = x.ProductId,
                    ProductName = x.Product.Name,
                    Quantity = x.Quantity
                })
                .FirstOrDefaultAsync(ct);

            return item!;
        }

        // --- GET PRODUCTS FROM WAREHOUSE ---
        public async Task<PagedResult<GetWarehouseProductItemDto>> GetProductsFromWarehouseAsync(
            int warehouseId,
            PaginationParams pagination,
            string? search = null,
            CancellationToken ct = default)
        {
            var exists = await _db.Warehouses.AnyAsync(w => w.Id == warehouseId, ct);
            if (!exists)
                throw new ArgumentException("Warehouse not found.");

            var query = _db.WarehouseProducts
                .AsNoTracking()
                .Where(x => x.WarehouseId == warehouseId)
                .Select(x => new GetWarehouseProductItemDto
                {
                    ProductId = x.ProductId,
                    ProductName = x.Product.Name,
                    Quantity = x.Quantity
                });

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalized = search.Trim().ToLower();
                query = query.Where(x => x.ProductName.ToLower().Contains(normalized));
            }

            query = query.OrderBy(x => x.ProductName);

            return await query.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
        }

        // --- ADD PRODUCT TO WAREHOUSE ---
        public async Task AddProductToWarehouseAsync(int warehouseId, AddProductToWarehouseDto dto, CancellationToken ct = default)
        {
            var wExists = await _db.Warehouses.AnyAsync(w => w.Id == warehouseId, ct);
            if (!wExists) throw new ArgumentException("Warehouse not found.");

            var pExists = await _db.Products.AnyAsync(p => p.Id == dto.ProductId, ct);
            if (!pExists) throw new ArgumentException("Product not found.");

            var link = await _db.WarehouseProducts
                .FirstOrDefaultAsync(x => x.WarehouseId == warehouseId && x.ProductId == dto.ProductId, ct);

            if (link is null)
            {
                link = new WarehouseProduct
                {
                    WarehouseId = warehouseId,
                    ProductId = dto.ProductId,
                    Quantity = dto.Quantity
                };
                _db.WarehouseProducts.Add(link);
            }
            else
            {
                checked { link.Quantity += dto.Quantity; }
            }

            await _db.SaveChangesAsync(ct);
        }

        // --- REMOVE PRODUCT FROM WAREHOUSE ---
        public async Task RemoveProductFromWarehouseAsync(int warehouseId, RemoveProductFromWarehouseDto dto, CancellationToken ct = default)
        {
            var link = await _db.WarehouseProducts
                .FirstOrDefaultAsync(x => x.WarehouseId == warehouseId && x.ProductId == dto.ProductId, ct);

            if (link is null) throw new ArgumentException("Product not found in warehouse.");

            if (dto.Quantity > link.Quantity)
                throw new ArgumentException("Quantity to remove exceeds stock in warehouse.");

            link.Quantity -= dto.Quantity;

            if (link.Quantity == 0)
                _db.WarehouseProducts.Remove(link);

            await _db.SaveChangesAsync(ct);
        }
    }
}