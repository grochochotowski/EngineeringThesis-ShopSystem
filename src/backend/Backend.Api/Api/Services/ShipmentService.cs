using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Controllers
{
    public interface IShipmentService
    {
        Task<IEnumerable<GetShipmentDto>> GetAllAsync(CancellationToken ct = default);
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

        public async Task<IEnumerable<GetShipmentDto>> GetAllAsync(CancellationToken ct = default)
        {
            return await _db.Shipments
                .AsNoTracking()
                .Select(s => new GetShipmentDto
                {
                    Id = s.Id,
                    Type = s.Type,
                    Status = s.Status,
                    SendDate = s.SendDate,
                    DeliveryDate = s.DeliveryDate,
                    DeliveryCompanyId = s.DeliveryCompanyId,
                    AddressSenderId = s.AddressSenderId,
                    AddressReceiverId = s.AddressReceiverId
                })
                .ToListAsync(ct);
        }

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
                    DeliveryDate = s.DeliveryDate,
                    DeliveryCompanyId = s.DeliveryCompanyId,
                    AddressSenderId = s.AddressSenderId,
                    AddressReceiverId = s.AddressReceiverId
                })
                .FirstOrDefaultAsync(ct);
        }

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

            return new GetShipmentParcelsDto
            {
                Parcels = parcels
            };
        }

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

        public async Task UpdateStatusAsync(int id, UpdateShipmentStatusDto dto, CancellationToken ct = default)
        {
            var s = await _db.Shipments.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (s is null) throw new KeyNotFoundException($"Shipment {id} not found.");

            s.Status = dto.Status;
            await _db.SaveChangesAsync(ct);
        }

        // ---------- Shipment <> Parcels ----------
        public async Task AddParcelsAsync(int shipmentId, List<int> parcelIds, CancellationToken ct = default)
        {
            if (parcelIds is null || parcelIds.Count == 0) return;

            parcelIds = parcelIds.Distinct().ToList();

            var s = await _db.Shipments.FirstOrDefaultAsync(x => x.Id == shipmentId, ct);
            if (s is null) throw new KeyNotFoundException($"Shipment {shipmentId} not found.");

            var parcels = await _db.Parcels.Where(p => parcelIds.Contains(p.Id)).ToListAsync(ct);

            var foundIds = parcels.Select(p => p.Id).ToList();
            var missing = parcelIds.Except(foundIds).ToList();
            if (missing.Count > 0)
                throw new ArgumentException($"Parcels not found: {string.Join(",", missing)}");

            var conflicting = parcels.Where(p => p.ShipmentId.HasValue && p.ShipmentId != shipmentId).ToList();
            if (conflicting.Count > 0)
                throw new InvalidOperationException(
                    $"Some parcels already belong to another shipment: {string.Join(",", conflicting.Select(c => c.Id))}");

            foreach (var p in parcels)
                p.ShipmentId = shipmentId;

            await _db.SaveChangesAsync(ct);
        }

        public async Task RemoveParcelsAsync(int shipmentId, List<int> parcelIds, CancellationToken ct = default)
        {
            if (parcelIds is null || parcelIds.Count == 0) return;

            parcelIds = parcelIds.Distinct().ToList();

            var sExists = await _db.Shipments.AsNoTracking().AnyAsync(x => x.Id == shipmentId, ct);
            if (!sExists) throw new KeyNotFoundException($"Shipment {shipmentId} not found.");

            var toUpdate = await _db.Parcels
                .Where(p => parcelIds.Contains(p.Id) && p.ShipmentId == shipmentId)
                .ToListAsync(ct);

            if (toUpdate.Count == 0) return;

            foreach (var p in toUpdate)
                p.ShipmentId = null;

            await _db.SaveChangesAsync(ct);
        }

        public async Task DeleteAsync(int id, CancellationToken ct = default)
        {
            var s = await _db.Shipments.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (s is null) return;

            _db.Shipments.Remove(s);
            await _db.SaveChangesAsync(ct);
        }

        private static void ValidateDates(DateTimeOffset send, DateTimeOffset delivery)
        {
            if (delivery < send)
                throw new ArgumentException("DeliveryDate cannot be earlier than SendDate.");
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