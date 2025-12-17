using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Services
{
    public class ShipmentService : IShipmentService
    {
        private readonly AppDbContext _db;
        public ShipmentService(AppDbContext db) => _db = db;

        // --- GET ALL SHIPMENTS (pagination and filters) ---
        public async Task<PagedResult<GetShipmentListItemDto>> GetAllAsync(
            string? q = null,
            ShipmentType? type = null,
            ShipmentStatus? status = null,
            DateTimeOffset? sendDateFrom = null,
            DateTimeOffset? sendDateTo = null,
            DateTimeOffset? deliveryDateFrom = null,
            DateTimeOffset? deliveryDateTo = null,
            string? orderBy = null,
            string? sortDirection = null,
            PaginationParams? pagination = null,
            CancellationToken ct = default)
        {
            pagination ??= new PaginationParams();

            var qry = _db.Shipments
                .AsNoTracking()
                .Include(s => s.SenderAddress)
                .Include(s => s.ReceiverAddress)
                .Include(s => s.ShipmentProducts)
                    .ThenInclude(sp => sp.Product)
                .AsQueryable();

            // Search filter (sender/receiver name or tax ID)
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                qry = qry.Where(s =>
                    (s.SenderName != null && s.SenderName.ToLower().Contains(term)) ||
                    (s.SenderTaxId != null && s.SenderTaxId.ToLower().Contains(term)) ||
                    (s.ReceiverName != null && s.ReceiverName.ToLower().Contains(term)) ||
                    (s.ReceiverTaxId != null && s.ReceiverTaxId.ToLower().Contains(term)));
            }

            // Type filter (Incoming/Outgoing)
            if (type.HasValue)
                qry = qry.Where(s => s.Type == type.Value);

            // Status filter
            if (status.HasValue)
                qry = qry.Where(s => s.Status == status.Value);

            // Date filters
            if (sendDateFrom.HasValue)
                qry = qry.Where(s => s.SendDate >= sendDateFrom.Value);

            if (sendDateTo.HasValue)
                qry = qry.Where(s => s.SendDate <= sendDateTo.Value);

            if (deliveryDateFrom.HasValue)
                qry = qry.Where(s => s.DeliveryDate >= deliveryDateFrom.Value);

            if (deliveryDateTo.HasValue)
                qry = qry.Where(s => s.DeliveryDate <= deliveryDateTo.Value);

            // Sorting
            qry = ApplySorting(qry, orderBy, sortDirection);

            // Get total count before pagination
            var totalCount = await qry.CountAsync(ct);

            // Materialize entities first (apply pagination)
            var entities = await qry
                .Skip((pagination.PageNumber - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync(ct);

            // Map to DTOs in memory (no EF translation issues)
            var dtos = entities.Select(s => new GetShipmentListItemDto
            {
                Id = s.Id,
                Type = (int)s.Type,
                Status = (int)s.Status,
                SendDate = s.SendDate,
                DeliveryDate = s.DeliveryDate,
                SenderName = s.SenderName,
                ReceiverName = s.ReceiverName,
                SenderTaxId = s.SenderTaxId,
                Weight = s.Weight,
                Length = s.Length,
                Width = s.Width,
                Height = s.Height,
                ProductCount = s.ShipmentProducts?.Count ?? 0,
                TotalQuantity = s.ShipmentProducts?.Sum(sp => sp.Quantity) ?? 0
            }).ToList();

            // Return PagedResult manually
            return new PagedResult<GetShipmentListItemDto>
            {
                Items = dtos,
                TotalCount = totalCount,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize
            };
        }

        // --- GET SHIPMENT BY ID ---
        public async Task<GetShipmentDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var shipment = await _db.Shipments
                .AsNoTracking()
                .Include(s => s.SenderAddress)
                .Include(s => s.ReceiverAddress)
                .Include(s => s.ShipmentProducts)
                    .ThenInclude(sp => sp.Product)
                .FirstOrDefaultAsync(s => s.Id == id, ct);

            if (shipment == null)
                return null;

            return new GetShipmentDto
            {
                Id = shipment.Id,
                Type = (int)shipment.Type,
                Status = (int)shipment.Status,
                SendDate = shipment.SendDate,
                DeliveryDate = shipment.DeliveryDate,
                Description = shipment.Description,
                Weight = shipment.Weight,
                Length = shipment.Length,
                Width = shipment.Width,
                Height = shipment.Height,
                SenderName = shipment.SenderName,
                SenderTaxId = shipment.SenderTaxId,
                SenderAddressId = shipment.SenderAddressId,
                SenderDetails = shipment.SenderDetails,
                SenderAddress = shipment.SenderAddress != null ? new GetAddressDto
                {
                    Id = shipment.SenderAddress.Id,
                    Street = shipment.SenderAddress.Street,
                    City = shipment.SenderAddress.City,
                    PostalCode = shipment.SenderAddress.PostalCode,
                    Building = shipment.SenderAddress.Building,
                    Premises = shipment.SenderAddress.Premises,
                    Country = shipment.SenderAddress.Country.ToString()
                } : null,
                ReceiverName = shipment.ReceiverName,
                ReceiverTaxId = shipment.ReceiverTaxId,
                ReceiverAddressId = shipment.ReceiverAddressId,
                ReceiverDetails = shipment.ReceiverDetails,
                ReceiverAddress = shipment.ReceiverAddress != null ? new GetAddressDto
                {
                    Id = shipment.ReceiverAddress.Id,
                    Street = shipment.ReceiverAddress.Street,
                    City = shipment.ReceiverAddress.City,
                    PostalCode = shipment.ReceiverAddress.PostalCode,
                    Building = shipment.ReceiverAddress.Building,
                    Premises = shipment.ReceiverAddress.Premises,
                    Country = shipment.ReceiverAddress.Country.ToString()
                } : null,
                ShipmentProducts = shipment.ShipmentProducts.Select(sp => new GetShipmentProductDto
                {
                    ShipmentId = sp.ShipmentId,
                    ProductId = sp.ProductId,
                    Quantity = sp.Quantity,
                    ProductSKU = sp.Product.SKU,
                    ProductName = sp.Product.Name,
                    ProductPrice = sp.Product.Price
                }).ToList()
            };
        }

        // --- CREATE SHIPMENT ---
        public async Task<GetShipmentDto> CreateAsync(CreateShipmentDto dto, CancellationToken ct = default)
        {
            // Validate addresses if provided
            if (dto.SenderAddressId.HasValue)
            {
                var senderExists = await _db.Addresses.AnyAsync(a => a.Id == dto.SenderAddressId.Value, ct);
                if (!senderExists)
                    throw new InvalidOperationException($"Sender address {dto.SenderAddressId.Value} not found.");
            }

            if (dto.ReceiverAddressId.HasValue)
            {
                var receiverExists = await _db.Addresses.AnyAsync(a => a.Id == dto.ReceiverAddressId.Value, ct);
                if (!receiverExists)
                    throw new InvalidOperationException($"Receiver address {dto.ReceiverAddressId.Value} not found.");
            }

            var entity = new Shipment
            {
                Type = (ShipmentType)dto.Type,
                Status = (ShipmentStatus)dto.Status,
                SendDate = dto.SendDate,
                DeliveryDate = dto.DeliveryDate,
                Description = dto.Description,
                Weight = dto.Weight,
                Length = dto.Length,
                Width = dto.Width,
                Height = dto.Height,
                SenderName = dto.SenderName,
                SenderTaxId = dto.SenderTaxId,
                SenderAddressId = dto.SenderAddressId,
                SenderDetails = dto.SenderDetails,
                ReceiverName = dto.ReceiverName,
                ReceiverTaxId = dto.ReceiverTaxId,
                ReceiverAddressId = dto.ReceiverAddressId,
                ReceiverDetails = dto.ReceiverDetails
            };

            _db.Shipments.Add(entity);
            await _db.SaveChangesAsync(ct);

            // Return the created shipment
            return (await GetByIdAsync(entity.Id, ct))!;
        }

        // --- UPDATE SHIPMENT ---
        public async Task UpdateAsync(int id, UpdateShipmentDto dto, CancellationToken ct = default)
        {
            var s = await _db.Shipments.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (s is null) throw new KeyNotFoundException($"Shipment {id} not found.");

            // Validate addresses if changed
            if (dto.SenderAddressId.HasValue && dto.SenderAddressId != s.SenderAddressId)
            {
                var senderExists = await _db.Addresses.AnyAsync(a => a.Id == dto.SenderAddressId.Value, ct);
                if (!senderExists)
                    throw new InvalidOperationException($"Sender address {dto.SenderAddressId.Value} not found.");
            }

            if (dto.ReceiverAddressId.HasValue && dto.ReceiverAddressId != s.ReceiverAddressId)
            {
                var receiverExists = await _db.Addresses.AnyAsync(a => a.Id == dto.ReceiverAddressId.Value, ct);
                if (!receiverExists)
                    throw new InvalidOperationException($"Receiver address {dto.ReceiverAddressId.Value} not found.");
            }

            s.Type = (ShipmentType)dto.Type;
            s.Status = (ShipmentStatus)dto.Status;
            s.SendDate = dto.SendDate;
            s.DeliveryDate = dto.DeliveryDate;
            s.Description = dto.Description;
            s.Weight = dto.Weight;
            s.Length = dto.Length;
            s.Width = dto.Width;
            s.Height = dto.Height;
            s.SenderName = dto.SenderName;
            s.SenderTaxId = dto.SenderTaxId;
            s.SenderAddressId = dto.SenderAddressId;
            s.SenderDetails = dto.SenderDetails;
            s.ReceiverName = dto.ReceiverName;
            s.ReceiverTaxId = dto.ReceiverTaxId;
            s.ReceiverAddressId = dto.ReceiverAddressId;
            s.ReceiverDetails = dto.ReceiverDetails;

            await _db.SaveChangesAsync(ct);
        }

        // --- UPDATE STATUS ---
        public async Task UpdateStatusAsync(int id, UpdateShipmentStatusDto dto, CancellationToken ct = default)
        {
            var s = await _db.Shipments.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (s is null) throw new KeyNotFoundException($"Shipment {id} not found.");

            // Validate required fields when changing to ReadyToCollect (2) or higher status
            if (dto.Status >= ShipmentStatus.ReadyToCollect)
            {
                // Check dimensions - provide specific error for each missing field
                if (s.Weight == null)
                {
                    throw new InvalidOperationException("Cannot update status: weight is required");
                }
                if (s.Length == null)
                {
                    throw new InvalidOperationException("Cannot update status: length is required");
                }
                if (s.Width == null)
                {
                    throw new InvalidOperationException("Cannot update status: width is required");
                }
                if (s.Height == null)
                {
                    throw new InvalidOperationException("Cannot update status: height is required");
                }

                // Check sender address
                if (s.SenderAddressId == null)
                {
                    throw new InvalidOperationException("Cannot update status: sender address is required");
                }

                // Check receiver address
                if (s.ReceiverAddressId == null)
                {
                    throw new InvalidOperationException("Cannot update status: receiver address is required");
                }
            }

            s.Status = dto.Status;

            // Auto-set send date when status changes to InTransit or higher (if not already set)
            if (dto.Status >= ShipmentStatus.InTransit && !s.SendDate.HasValue)
            {
                s.SendDate = DateTimeOffset.UtcNow;
            }

            // Auto-set delivery date when status changes to Delivered (if not already set)
            if (dto.Status == ShipmentStatus.Delivered && !s.DeliveryDate.HasValue)
            {
                s.DeliveryDate = DateTimeOffset.UtcNow;
            }

            await _db.SaveChangesAsync(ct);
        }

        // --- ADD PRODUCTS TO SHIPMENT ---
        public async Task AddProductsAsync(int shipmentId, List<ShipmentProductItemDto> products, CancellationToken ct = default)
        {
            if (products is null || products.Count == 0) return;

            var shipment = await _db.Shipments.FirstOrDefaultAsync(x => x.Id == shipmentId, ct);
            if (shipment is null)
                throw new KeyNotFoundException($"Shipment {shipmentId} not found.");

            // Validate all products exist
            var productIds = products.Select(p => p.ProductId).Distinct().ToList();
            var existingProducts = await _db.Products
                .Where(p => productIds.Contains(p.Id))
                .Select(p => p.Id)
                .ToListAsync(ct);

            var missingProducts = productIds.Except(existingProducts).ToList();
            if (missingProducts.Any())
                throw new InvalidOperationException($"Products not found: {string.Join(", ", missingProducts)}");

            foreach (var item in products)
            {
                // Check if product already in shipment
                var existing = await _db.ShipmentProducts
                    .FirstOrDefaultAsync(sp => sp.ShipmentId == shipmentId && sp.ProductId == item.ProductId, ct);

                if (existing != null)
                {
                    // Update quantity
                    existing.Quantity += item.Quantity;
                }
                else
                {
                    // Add new
                    _db.ShipmentProducts.Add(new ShipmentProduct
                    {
                        ShipmentId = shipmentId,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity
                    });
                }
            }

            await _db.SaveChangesAsync(ct);
        }

        // --- REMOVE PRODUCTS FROM SHIPMENT ---
        public async Task RemoveProductsAsync(int shipmentId, List<int> productIds, CancellationToken ct = default)
        {
            if (productIds is null || productIds.Count == 0) return;

            var toRemove = await _db.ShipmentProducts
                .Where(sp => sp.ShipmentId == shipmentId && productIds.Contains(sp.ProductId))
                .ToListAsync(ct);

            _db.ShipmentProducts.RemoveRange(toRemove);
            await _db.SaveChangesAsync(ct);
        }

        // --- DELETE SHIPMENT ---
        public async Task DeleteAsync(int id, CancellationToken ct = default)
        {
            var s = await _db.Shipments
                .Include(x => x.ShipmentProducts)
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            if (s is null) throw new KeyNotFoundException($"Shipment {id} not found.");

            // Remove all shipment products first
            if (s.ShipmentProducts.Any())
                _db.ShipmentProducts.RemoveRange(s.ShipmentProducts);

            _db.Shipments.Remove(s);
            await _db.SaveChangesAsync(ct);
        }

        // --- HELPER: Apply sorting ---
        private IQueryable<Shipment> ApplySorting(IQueryable<Shipment> query, string? orderBy, string? sortDirection)
        {
            var isDescending = sortDirection?.ToLower() == "desc";

            return orderBy?.ToLower() switch
            {
                "id" => isDescending ? query.OrderByDescending(s => s.Id) : query.OrderBy(s => s.Id),
                "type" => isDescending ? query.OrderByDescending(s => s.Type) : query.OrderBy(s => s.Type),
                "status" => isDescending ? query.OrderByDescending(s => s.Status) : query.OrderBy(s => s.Status),
                "senddate" => isDescending ? query.OrderByDescending(s => s.SendDate) : query.OrderBy(s => s.SendDate),
                "deliverydate" => isDescending ? query.OrderByDescending(s => s.DeliveryDate) : query.OrderBy(s => s.DeliveryDate),
                "sendername" => isDescending ? query.OrderByDescending(s => s.SenderName) : query.OrderBy(s => s.SenderName),
                "receivername" => isDescending ? query.OrderByDescending(s => s.ReceiverName) : query.OrderBy(s => s.ReceiverName),
                _ => query.OrderByDescending(s => s.Id) // Default: newest first
            };
        }
    }
}
