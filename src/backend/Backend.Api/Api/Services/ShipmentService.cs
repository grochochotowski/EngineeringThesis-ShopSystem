using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Services
{
    public interface IShipmentService
    {
        Task<PagedResult<GetShipmentDto>> GetAllAsync(
            string? q = null,
            ShipmentType? type = null,
            ShipmentStatus? status = null,
            int? deliveryCompanyId = null,
            PaginationParams? pagination = null,
            CancellationToken ct = default);

        Task<GetShipmentDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<GetShipmentParcelsDto?> GetParcelsAsync(int shipmentId, CancellationToken ct = default);

        Task<int> CreateAsync(CreateShipmentDto dto, CancellationToken ct = default);
        Task UpdateAsync(int id, UpdateShipmentDto dto, CancellationToken ct = default);
        Task UpdateStatusAsync(int id, UpdateShipmentStatusDto dto, CancellationToken ct = default);

        Task AddParcelsAsync(int shipmentId, List<int> parcelIds, CancellationToken ct = default);
        Task RemoveParcelsAsync(int shipmentId, List<int> parcelIds, CancellationToken ct = default);
        Task DeleteAsync(int id, CancellationToken ct = default);
    }

    public class ShipmentService : IShipmentService
    {
        private readonly AppDbContext _db;
        public ShipmentService(AppDbContext db) => _db = db;

        // --- GET ALL SHIPMENTS (pagination and filters) ---
        public async Task<PagedResult<GetShipmentDto>> GetAllAsync(
            string? q = null,
            ShipmentType? type = null,
            ShipmentStatus? status = null,
            int? deliveryCompanyId = null,
            PaginationParams? pagination = null,
            CancellationToken ct = default)
        {
            pagination ??= new PaginationParams();

            var qry = _db.Shipments
                .AsNoTracking()
                .Include(s => s.AddressSender)
                .Include(s => s.AddressReceiver)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                qry = qry.Where(s =>
                    s.Id.ToString().Contains(term) ||
                    (s.AddressSender != null && s.AddressSender.City.ToLower().Contains(term)) ||
                    (s.AddressReceiver != null && s.AddressReceiver.City.ToLower().Contains(term)));
            }

            if (type.HasValue)
                qry = qry.Where(s => s.Type == type.Value);

            if (status.HasValue)
                qry = qry.Where(s => s.Status == status.Value);

            if (deliveryCompanyId.HasValue)
                qry = qry.Where(s => s.DeliveryCompanyId == deliveryCompanyId.Value);

            var projected = qry
                .OrderByDescending(s => s.SendDate)
                .Select(s => new GetShipmentDto
                {
                    Id = s.Id,
                    Type = s.Type,
                    Status = s.Status,
                    SendDate = s.SendDate,
                    DeliveryDate = s.DeliveryDate ?? DateTimeOffset.MinValue,
                    DeliveryCompanyId = s.DeliveryCompanyId,
                    AddressSenderId = s.AddressSenderId,
                    AddressReceiverId = s.AddressReceiverId
                });

            return await projected.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
        }

        // --- GET SHIPMENT BY ID  ---
        public async Task<GetShipmentDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            return await _db.Shipments
                .AsNoTracking()
                .Where(s => s.Id == id)
                .Select(s => new GetShipmentDto
                {
                    Id = s.Id,
                    Type = s.Type,
                    Status = s.Status,
                    SendDate = s.SendDate,
                    DeliveryDate = s.DeliveryDate ?? DateTimeOffset.MinValue,
                    DeliveryCompanyId = s.DeliveryCompanyId,
                    AddressSenderId = s.AddressSenderId,
                    AddressReceiverId = s.AddressReceiverId
                })
                .FirstOrDefaultAsync(ct);
        }

        // --- GET PARCELS OF SHIPMENT ---
        public async Task<GetShipmentParcelsDto?> GetParcelsAsync(int shipmentId, CancellationToken ct = default)
        {
            var exists = await _db.Shipments.AsNoTracking().AnyAsync(x => x.Id == shipmentId, ct);
            if (!exists) return null;

            var parcels = await _db.Parcels
                .AsNoTracking()
                .Where(p => p.ShipmentId == shipmentId)
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

            return new GetShipmentParcelsDto { Parcels = parcels };
        }

        // --- CREATE SHIPMENT ---
        public async Task<int> CreateAsync(CreateShipmentDto dto, CancellationToken ct = default)
        {
            await ValidateForeignKeys(dto.DeliveryCompanyId, dto.AddressSenderId, dto.AddressReceiverId, ct);
            ValidateDates(dto.SendDate, dto.DeliveryDate);

            var entity = new Shipment
            {
                Type = dto.Type,
                Status = dto.Status,
                SendDate = dto.SendDate,
                DeliveryDate = dto.DeliveryDate,
                DeliveryCompanyId = dto.DeliveryCompanyId,
                AddressSenderId = dto.AddressSenderId,
                AddressReceiverId = dto.AddressReceiverId
            };

            _db.Shipments.Add(entity);
            await _db.SaveChangesAsync(ct);
            return entity.Id;
        }

        // --- UPDATE SHIPMENT ---
        public async Task UpdateAsync(int id, UpdateShipmentDto dto, CancellationToken ct = default)
        {
            var s = await _db.Shipments.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (s is null) throw new KeyNotFoundException($"Shipment {id} not found.");

            await ValidateForeignKeys(dto.DeliveryCompanyId, dto.AddressSenderId, dto.AddressReceiverId, ct);
            ValidateDates(dto.SendDate, dto.DeliveryDate);

            s.Type = dto.Type;
            s.Status = dto.Status;
            s.SendDate = dto.SendDate;
            s.DeliveryDate = dto.DeliveryDate;
            s.DeliveryCompanyId = dto.DeliveryCompanyId;
            s.AddressSenderId = dto.AddressSenderId;
            s.AddressReceiverId = dto.AddressReceiverId;

            await _db.SaveChangesAsync(ct);
        }

        // --- UPDATE STATUS ---
        public async Task UpdateStatusAsync(int id, UpdateShipmentStatusDto dto, CancellationToken ct = default)
        {
            var s = await _db.Shipments.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (s is null) throw new KeyNotFoundException($"Shipment {id} not found.");
            s.Status = dto.Status;
            await _db.SaveChangesAsync(ct);
        }

        // --- ADD PARCELS ---
        public async Task AddParcelsAsync(int shipmentId, List<int> parcelIds, CancellationToken ct = default)
        {
            if (parcelIds is null || parcelIds.Count == 0) return;

            parcelIds = parcelIds.Distinct().ToList();
            var s = await _db.Shipments.FirstOrDefaultAsync(x => x.Id == shipmentId, ct)
                ?? throw new KeyNotFoundException($"Shipment {shipmentId} not found.");

            var parcels = await _db.Parcels.Where(p => parcelIds.Contains(p.Id)).ToListAsync(ct);

            // 🔒 Conflict validation
            var conflicts = parcels
                .Where(p => p.ShipmentId.HasValue && p.ShipmentId != shipmentId)
                .Select(p => p.Id)
                .ToList();

            if (conflicts.Count > 0)
                throw new InvalidOperationException($"Parcels already belong to another shipment: {string.Join(", ", conflicts)}");

            foreach (var p in parcels)
                p.ShipmentId = shipmentId;

            await _db.SaveChangesAsync(ct);
        }

        // --- REMOVE PARCELS ---
        public async Task RemoveParcelsAsync(int shipmentId, List<int> parcelIds, CancellationToken ct = default)
        {
            if (parcelIds is null || parcelIds.Count == 0) return;

            var parcels = await _db.Parcels
                .Where(p => p.ShipmentId == shipmentId && parcelIds.Contains(p.Id))
                .ToListAsync(ct);

            foreach (var p in parcels)
                p.ShipmentId = null;

            await _db.SaveChangesAsync(ct);
        }

        // --- DELETE SHIPMENT (cascade delete parcels) ---
        public async Task DeleteAsync(int id, CancellationToken ct = default)
        {
            var s = await _db.Shipments
                .Include(x => x.Parcels)
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            if (s is null) return;

            if (s.Parcels.Any())
                _db.Parcels.RemoveRange(s.Parcels);

            _db.Shipments.Remove(s);
            await _db.SaveChangesAsync(ct);
        }

        // --- VALIDATION HELPERS ---
        private static void ValidateDates(DateTimeOffset send, DateTimeOffset delivery)
        {
            if (delivery < send)
                throw new ArgumentException("DeliveryDate cannot be earlier than SendDate.", nameof(delivery));
        }

        private async Task ValidateForeignKeys(int deliveryCompanyId, int senderAddressId, int receiverAddressId, CancellationToken ct)
        {
            var dcExists = await _db.DeliveryCompanies.AnyAsync(x => x.Id == deliveryCompanyId, ct);
            var senderExists = await _db.Addresses.AnyAsync(x => x.Id == senderAddressId, ct);
            var receiverExists = await _db.Addresses.AnyAsync(x => x.Id == receiverAddressId, ct);

            if (!dcExists) throw new ArgumentException($"DeliveryCompany {deliveryCompanyId} not found.");
            if (!senderExists) throw new ArgumentException($"Sender Address {senderAddressId} not found.");
            if (!receiverExists) throw new ArgumentException($"Receiver Address {receiverAddressId} not found.");
        }
    }
}
