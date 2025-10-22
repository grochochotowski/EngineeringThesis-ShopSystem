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
        Task<IReadOnlyList<GetParcelDto>> GetAllAsync(
            string? q = null,
            int? shipmentId = null,
            CancellationToken ct = default);

        Task<bool> UpdateAsync(int id, UpdateParcelDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);

        Task<GetParcelProductsDto> GetProductsAsync(int parcelId, CancellationToken ct = default);
        Task<bool> AddProductAsync(int parcelId, AddProductToParcelDto dto, CancellationToken ct = default);
        Task<bool> RemoveProductAsync(int parcelId, RemoveProductFromParcelDto dto, CancellationToken ct = default);
    }

    public sealed class ParcelsService : IParcelsService
    {
        private readonly AppDbContext _db;

        public ParcelsService(AppDbContext db) => _db = db;

        public async Task<GetParcelDto> CreateAsync(CreateParcelDto dto, CancellationToken ct = default)
        {
            if (dto.ShipmentId.HasValue)
            {
                var exists = await _db.Shipments.AnyAsync(s => s.Id == dto.ShipmentId.Value, ct);
                if (!exists) throw new InvalidOperationException("Shipment not found.");
            }

            var e = new Parcel
            {
                Description = dto.Description.Trim(),
                Weight = dto.Weight,
                Length = dto.Length,
                Width = dto.Width,
                Height = dto.Height,
                ShipmentId = dto.ShipmentId
            };

            _db.Parcels.Add(e);
            await _db.SaveChangesAsync(ct);

            return Map(e);
        }

        public async Task<GetParcelDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var e = await _db.Parcels.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            return e is null ? null : Map(e);
        }

        public async Task<IReadOnlyList<GetParcelDto>> GetAllAsync(string? q = null, int? shipmentId = null, CancellationToken ct = default)
        {
            var qry = _db.Parcels.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                qry = qry.Where(p => p.Description.Contains(term));
            }

            if (shipmentId.HasValue)
            {
                var sid = shipmentId.Value;
                qry = qry.Where(p => p.ShipmentId == sid);
            }

            return await qry
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
                })
                .ToListAsync(ct);
        }

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

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var e = await _db.Parcels.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (e is null) return false;

            _db.Parcels.Remove(e);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // ---------- Products in a package ----------

        public async Task<GetParcelProductsDto> GetProductsAsync(int parcelId, CancellationToken ct = default)
        {
            var exists = await _db.Parcels.AsNoTracking().AnyAsync(p => p.Id == parcelId, ct);
            if (!exists) throw new KeyNotFoundException("Parcel not found.");

            var items = await _db.ParcelProducts
                .AsNoTracking()
                .Where(pp => pp.ParcelId == parcelId)
                .Select(pp => new ParcelProductItemDto
                {
                    ProductId = pp.ProductId,
                    ProductName = pp.Product.Name,
                    Quantity = pp.Quantity
                })
                .ToListAsync(ct);

            return new GetParcelProductsDto { Products = items };
        }

        public async Task<bool> AddProductAsync(int parcelId, AddProductToParcelDto dto, CancellationToken ct = default)
        {
            var parcel = await _db.Parcels.FirstOrDefaultAsync(p => p.Id == parcelId, ct);
            if (parcel is null) return false;

            var product = await _db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == dto.ProductId, ct);
            if (product is null) throw new InvalidOperationException("Product not found.");

            var link = await _db.ParcelProducts.FirstOrDefaultAsync(pp => pp.ParcelId == parcelId && pp.ProductId == dto.ProductId, ct);
            if (link is null)
            {
                link = new ParcelProduct { ParcelId = parcelId, ProductId = dto.ProductId, Quantity = dto.Quantity };
                _db.ParcelProducts.Add(link);
            }
            else
            {
                checked { link.Quantity += dto.Quantity; }
            }

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> RemoveProductAsync(int parcelId, RemoveProductFromParcelDto dto, CancellationToken ct = default)
        {
            var parcel = await _db.Parcels.FirstOrDefaultAsync(p => p.Id == parcelId, ct);
            if (parcel is null) return false;

            var link = await _db.ParcelProducts.FirstOrDefaultAsync(pp => pp.ParcelId == parcelId && pp.ProductId == dto.ProductId, ct);
            if (link is null) return false;

            if (dto.Quantity >= link.Quantity)
            {
                _db.ParcelProducts.Remove(link);
            }
            else
            {
                link.Quantity -= dto.Quantity;
            }

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // ---------- mapowanie ----------
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