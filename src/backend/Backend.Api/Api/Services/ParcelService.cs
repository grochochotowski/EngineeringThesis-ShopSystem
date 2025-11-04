using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Controllers
{
    public interface IParcelsService
    {
        Task<GetParcelDto> CreateAsync(CreateParcelDto dto, CancellationToken ct = default);
        Task<GetParcelDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<PagedResult<GetParcelDto>> GetAllAsync(string? q = null, int? shipmentId = null, PaginationParams? pagination = null, CancellationToken ct = default);
        Task<bool> UpdateAsync(int id, UpdateParcelDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);

        Task<PagedResult<ParcelProductItemDto>> GetProductsAsync(int parcelId, PaginationParams? pagination = null, CancellationToken ct = default);
        Task<bool> AddProductAsync(int parcelId, AddProductToParcelDto dto, CancellationToken ct = default);
        Task<bool> RemoveProductAsync(int parcelId, RemoveProductFromParcelDto dto, CancellationToken ct = default);
    }

    public sealed class ParcelsService : IParcelsService
    {
        private readonly AppDbContext _db;

        public ParcelsService(AppDbContext db) => _db = db;

        // --- CREATE PARCEL ---
        public async Task<GetParcelDto> CreateAsync(CreateParcelDto dto, CancellationToken ct = default)
        {
            if (dto.ShipmentId.HasValue)
            {
                var exists = await _db.Shipments.AnyAsync(s => s.Id == dto.ShipmentId.Value, ct);
                if (!exists) throw new InvalidOperationException("Shipment not found.");
            }

            var entity = new Parcel
            {
                Description = dto.Description.Trim(),
                Weight = dto.Weight,
                Length = dto.Length,
                Width = dto.Width,
                Height = dto.Height,
                ShipmentId = dto.ShipmentId
            };

            _db.Parcels.Add(entity);
            await _db.SaveChangesAsync(ct);
            return Map(entity);
        }

        // --- GET PARCEL BY ID ---
        public async Task<GetParcelDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var e = await _db.Parcels.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            return e is null ? null : Map(e);
        }

        // --- GET ALL PARCELS (with pagination) ---
        public async Task<PagedResult<GetParcelDto>> GetAllAsync(string? q = null, int? shipmentId = null, PaginationParams? pagination = null, CancellationToken ct = default)
        {
            pagination ??= new PaginationParams();

            var qry = _db.Parcels.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                qry = qry.Where(p => p.Description.ToLower().Contains(term));
            }

            if (shipmentId.HasValue)
                qry = qry.Where(p => p.ShipmentId == shipmentId.Value);

            var projected = qry
                .OrderBy(p => p.Id)
                .Select(p => new GetParcelDto
                {
                    Id = p.Id,
                    Description = p.Description,
                    Weight = p.Weight,
                    Length = p.Length,
                    Width = p.Width,
                    Height = p.Height,
                    ShipmentId = p.ShipmentId
                });

            return await projected.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
        }

        // --- UPDATE PARCEL ---
        public async Task<bool> UpdateAsync(int id, UpdateParcelDto dto, CancellationToken ct = default)
        {
            var e = await _db.Parcels.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (e is null) return false;

            e.Description = dto.Description.Trim();
            e.Weight = dto.Weight;
            e.Length = dto.Length;
            e.Width = dto.Width;
            e.Height = dto.Height;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- DELETE PARCEL ---
        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var e = await _db.Parcels
                .Include(p => p.ParcelProducts)
                .FirstOrDefaultAsync(p => p.Id == id, ct);

            if (e is null)
                return false;

            // cannot delete parcel that belongs to a shipment (with this endpoint)
            if (e.ShipmentId is not null)
                throw new InvalidOperationException("Cannot delete parcel that belongs to a shipment.");

            // remove related ParcelProducts
            if (e.ParcelProducts.Any())
                _db.ParcelProducts.RemoveRange(e.ParcelProducts);

            _db.Parcels.Remove(e);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- GET PARCEL ITEMS ---
        public async Task<PagedResult<ParcelProductItemDto>> GetProductsAsync(int parcelId, PaginationParams? pagination = null, CancellationToken ct = default)
        {
            pagination ??= new PaginationParams();

            var exists = await _db.Parcels.AsNoTracking().AnyAsync(p => p.Id == parcelId, ct);
            if (!exists)
                throw new KeyNotFoundException("Parcel not found.");

            var query = _db.ParcelProducts
                .AsNoTracking()
                .Where(pp => pp.ParcelId == parcelId)
                .Select(pp => new ParcelProductItemDto
                {
                    ProductId = pp.ProductId,
                    ProductName = pp.Product.Name,
                    Quantity = pp.Quantity
                });

            return await query.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
        }

        // --- ADD PRODUCT TO PARCEL ---
        public async Task<bool> AddProductAsync(int parcelId, AddProductToParcelDto dto, CancellationToken ct = default)
        {
            var parcel = await _db.Parcels.FirstOrDefaultAsync(p => p.Id == parcelId, ct);
            if (parcel is null) return false;

            var product = await _db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == dto.ProductId, ct);
            if (product is null) throw new InvalidOperationException("Product not found.");

            var link = await _db.ParcelProducts.FirstOrDefaultAsync(pp => pp.ParcelId == parcelId && pp.ProductId == dto.ProductId, ct);
            if (link is null)
                _db.ParcelProducts.Add(new ParcelProduct { ParcelId = parcelId, ProductId = dto.ProductId, Quantity = dto.Quantity });
            else
                link.Quantity += dto.Quantity;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- REMOVE PRODUCT FROM PARCEL ---
        public async Task<bool> RemoveProductAsync(int parcelId, RemoveProductFromParcelDto dto, CancellationToken ct = default)
        {
            var link = await _db.ParcelProducts.FirstOrDefaultAsync(pp => pp.ParcelId == parcelId && pp.ProductId == dto.ProductId, ct);
            if (link is null) return false;

            if (dto.Quantity >= link.Quantity)
                _db.ParcelProducts.Remove(link);
            else
                link.Quantity -= dto.Quantity;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- MAPPING ---
        private static GetParcelDto Map(Parcel p) => new()
        {
            Id = p.Id,
            Description = p.Description,
            Weight = p.Weight,
            Length = p.Length,
            Width = p.Width,
            Height = p.Height,
            ShipmentId = p.ShipmentId
        };
    }
}