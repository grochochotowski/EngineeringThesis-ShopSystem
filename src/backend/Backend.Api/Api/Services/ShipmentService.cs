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
        private readonly IAddressService _addressService;
        public ShipmentService(AppDbContext db, IAddressService addressService)
        {
            _db = db;
            _addressService = addressService;
        }

        // --- GET ALL SHIPMENTS (pagination and filters) ---
        public async Task<PagedResult<GetShipmentListItemDto>> GetAllAsync(
            string? q = null,
            ShipmentType? type = null,
            List<ShipmentStatus>? statuses = null,
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

            // Status filter - support multiple statuses
            if (statuses != null && statuses.Any())
                qry = qry.Where(s => statuses.Contains(s.Status));

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
                // For outgoing shipments, use CollectedQuantity when Quantity is 0 (extra products added during preparation)
                // For incoming shipments, use Quantity (declared quantity)
                TotalQuantity = s.ShipmentProducts?.Sum(sp =>
                    sp.Quantity == 0 && sp.CollectedQuantity.HasValue
                        ? sp.CollectedQuantity.Value
                        : sp.Quantity
                ) ?? 0
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
                    CollectedQuantity = sp.CollectedQuantity,
                    ProductSKU = sp.Product.SKU,
                    ProductName = sp.Product.Name,
                    ProductPrice = sp.Product.Price
                }).ToList()
            };
        }

        // --- GET SHIPMENT PRODUCTS ---
        public async Task<List<GetShipmentProductDto>> GetShipmentProductsAsync(int shipmentId, CancellationToken ct = default)
        {
            var shipment = await _db.Shipments
                .AsNoTracking()
                .Include(s => s.ShipmentProducts)
                    .ThenInclude(sp => sp.Product)
                .FirstOrDefaultAsync(s => s.Id == shipmentId, ct);

            if (shipment == null)
                throw new KeyNotFoundException($"Shipment {shipmentId} not found.");

            return shipment.ShipmentProducts.Select(sp => new GetShipmentProductDto
            {
                ShipmentId = sp.ShipmentId,
                ProductId = sp.ProductId,
                Quantity = sp.Quantity,
                CollectedQuantity = sp.CollectedQuantity,
                ProductSKU = sp.Product.SKU,
                ProductName = sp.Product.Name,
                ProductPrice = sp.Product.Price
            }).ToList();
        }

        // --- CREATE SHIPMENT ---
        public async Task<GetShipmentDto> CreateAsync(CreateShipmentDto dto, CancellationToken ct = default)
        {
            // Validate addresses if provided
            // Note: Address IDs are validated by checking if they exist in the database
            // If the ID is not found, throw an error
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

            // Validate required fields when changing to AwaitingPickup (2) or higher status
            // Note: InPreparation (1) does not require these fields yet
            // Note: Collected (5) comes after Delivered (4) for incoming shipments
            if (dto.Status >= ShipmentStatus.AwaitingPickup && dto.Status != ShipmentStatus.Collected)
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

        // --- COMPLETE COLLECTION (incoming shipments only) ---
        public async Task CompleteCollectionAsync(int shipmentId, CompleteCollectionDto dto, int userId, CancellationToken ct = default)
        {
            var shipment = await _db.Shipments
                .Include(s => s.ShipmentProducts)
                .FirstOrDefaultAsync(s => s.Id == shipmentId, ct);

            if (shipment is null)
                throw new KeyNotFoundException($"Shipment {shipmentId} not found.");

            if (shipment.Type != ShipmentType.Incoming)
                throw new InvalidOperationException("Only incoming shipments can be collected.");

            if (shipment.Status != ShipmentStatus.Delivered)
                throw new InvalidOperationException($"Cannot collect shipment with status {shipment.Status}. Only delivered shipments can be collected.");

            // Validate all locations exist (flatten all location IDs from all products)
            var allLocationIds = dto.CollectedProducts
                .SelectMany(cp => cp.LocationIds)
                .Distinct()
                .ToList();

            var existingLocations = await _db.Locations
                .Where(l => allLocationIds.Contains(l.Id))
                .Select(l => l.Id)
                .ToListAsync(ct);

            var missingLocations = allLocationIds.Except(existingLocations).ToList();
            if (missingLocations.Any())
                throw new InvalidOperationException($"Locations not found: {string.Join(", ", missingLocations)}");

            // Process each collected product
            foreach (var collectedProduct in dto.CollectedProducts)
            {
                var shipmentProduct = shipment.ShipmentProducts
                    .FirstOrDefault(sp => sp.ProductId == collectedProduct.ProductId);

                if (shipmentProduct != null)
                {
                    // Product was in manifest - update collected quantity
                    shipmentProduct.CollectedQuantity = collectedProduct.CollectedQuantity;
                }
                else
                {
                    // Extra product not in manifest - create new ShipmentProduct record
                    _db.ShipmentProducts.Add(new ShipmentProduct
                    {
                        ShipmentId = shipmentId,
                        ProductId = collectedProduct.ProductId,
                        Quantity = 0, // No declared quantity (extra product)
                        CollectedQuantity = collectedProduct.CollectedQuantity
                    });
                }

                // Update warehouse inventory for each location
                if (collectedProduct.CollectedQuantity > 0)
                {
                    // Distribute collected quantity across locations
                    // Simple strategy: divide quantity equally, remainder to first location
                    var locationsCount = collectedProduct.LocationIds.Count;
                    var qtyPerLocation = collectedProduct.CollectedQuantity / locationsCount;
                    var remainder = collectedProduct.CollectedQuantity % locationsCount;

                    for (int i = 0; i < collectedProduct.LocationIds.Count; i++)
                    {
                        var locationId = collectedProduct.LocationIds[i];
                        var qtyForThisLocation = qtyPerLocation + (i == 0 ? remainder : 0);

                        if (qtyForThisLocation > 0)
                        {
                            var warehouseEntry = await _db.ProductsInWarehouse
                                .FirstOrDefaultAsync(pw => pw.ProductId == collectedProduct.ProductId
                                    && pw.LocationId == locationId, ct);

                            if (warehouseEntry != null)
                            {
                                warehouseEntry.Quantity += qtyForThisLocation;
                            }
                            else
                            {
                                _db.ProductsInWarehouse.Add(new ProductsInWarehouse
                                {
                                    ProductId = collectedProduct.ProductId,
                                    LocationId = locationId,
                                    Quantity = qtyForThisLocation
                                });
                            }
                        }
                    }
                }
            }

            // Update shipment status to Collected
            shipment.Status = ShipmentStatus.Collected;

            await _db.SaveChangesAsync(ct);
        }

        // --- GET SHIPMENT PRODUCT COLLECTION (grouped by product) ---
        public async Task<List<GetShipmentProductCollectionGroupedDto>> GetShipmentProductCollectionAsync(int shipmentId, CancellationToken ct = default)
        {
            // Query ShipmentProduct for collection data
            var shipmentProducts = await _db.ShipmentProducts
                .AsNoTracking()
                .Where(sp => sp.ShipmentId == shipmentId && sp.CollectedQuantity.HasValue)
                .Include(sp => sp.Product)
                .OrderBy(sp => sp.Product.Name)
                .ToListAsync(ct);

            if (!shipmentProducts.Any())
                return new List<GetShipmentProductCollectionGroupedDto>();

            // For each product with collected quantity, find warehouse locations where it was stored
            var result = new List<GetShipmentProductCollectionGroupedDto>();
            foreach (var sp in shipmentProducts)
            {
                // Get warehouse locations for this product
                var warehouseLocations = await _db.ProductsInWarehouse
                    .AsNoTracking()
                    .Where(pw => pw.ProductId == sp.ProductId)
                    .Include(pw => pw.Location)
                    .Select(pw => new CollectionLocationDto
                    {
                        LocationId = pw.LocationId,
                        LocationCode = pw.Location.LocationCode,
                        Quantity = pw.Quantity
                    })
                    .ToListAsync(ct);

                result.Add(new GetShipmentProductCollectionGroupedDto
                {
                    ProductId = sp.ProductId,
                    ProductName = sp.Product.Name,
                    ProductSku = sp.Product.SKU,
                    TotalDeclaredQuantity = sp.Quantity,
                    TotalCollectedQuantity = sp.CollectedQuantity ?? 0,
                    Locations = warehouseLocations
                });
            }

            return result;
        }

        // --- COMPLETE PREPARATION (outgoing shipments) ---
        public async Task CompletePreparationAsync(int shipmentId, CompletePreparationDto dto, int userId, CancellationToken ct = default)
        {
            var shipment = await _db.Shipments
                .Include(s => s.ShipmentProducts)
                .FirstOrDefaultAsync(s => s.Id == shipmentId, ct);

            if (shipment is null)
                throw new KeyNotFoundException($"Shipment {shipmentId} not found.");

            if (shipment.Type != ShipmentType.Outgoing)
                throw new InvalidOperationException("Only outgoing shipments can be prepared.");

            if (shipment.Status != ShipmentStatus.InPreparation)
                throw new InvalidOperationException($"Cannot prepare shipment with status {shipment.Status}. Only shipments in preparation can be prepared.");

            // Use explicit IsFinishing flag to determine operation mode
            bool isFinishingPreparation = dto.IsFinishing;

            // Validate dimensions when finishing preparation
            if (isFinishingPreparation)
            {
                if (!dto.Weight.HasValue || !dto.Length.HasValue || !dto.Width.HasValue || !dto.Height.HasValue)
                {
                    throw new InvalidOperationException(
                        "All dimensions (Weight, Length, Width, Height) are required when finishing preparation.");
                }
            }

            // When saving progress, we need to restore previous preparation BEFORE validation
            // This ensures we validate against the correct warehouse state
            if (!isFinishingPreparation)
            {
                // For "Save Progress": First, restore inventory from previous preparation (if any)
                var existingPreparationRecords = await _db.ShipmentProductLocations
                    .Where(spl => spl.ShipmentId == shipmentId)
                    .ToListAsync(ct);

                foreach (var record in existingPreparationRecords)
                {
                    // Restore inventory to warehouse
                    var warehouseEntry = await _db.ProductsInWarehouse
                        .FirstOrDefaultAsync(pw => pw.ProductId == record.ProductId
                            && pw.LocationId == record.LocationId, ct);

                    if (warehouseEntry != null)
                    {
                        warehouseEntry.Quantity += record.Quantity;
                    }
                    else
                    {
                        _db.ProductsInWarehouse.Add(new ProductsInWarehouse
                        {
                            ProductId = record.ProductId,
                            LocationId = record.LocationId,
                            Quantity = record.Quantity
                        });
                    }
                }

                // Remove existing preparation records
                _db.ShipmentProductLocations.RemoveRange(existingPreparationRecords);
            }

            // Validate all locations exist and have sufficient inventory
            // NOTE: For save progress, this validation happens AFTER restoring previous preparation
            // This ensures we validate against the correct warehouse state
            foreach (var preparedProduct in dto.PreparedProducts)
            {
                var totalPreparedQty = preparedProduct.SourceLocations.Sum(sl => sl.Quantity);

                // Check if product exists in shipment manifest
                var shipmentProduct = shipment.ShipmentProducts
                    .FirstOrDefault(sp => sp.ProductId == preparedProduct.ProductId);

                // If product is in manifest and finishing preparation, validate total prepared quantity matches manifest
                // When saving progress, allow partial quantities
                // Only validate products that were in the original manifest (Quantity > 0)
                if (isFinishingPreparation && shipmentProduct != null && shipmentProduct.Quantity > 0 && totalPreparedQty != shipmentProduct.Quantity)
                {
                    throw new InvalidOperationException(
                        $"Total prepared quantity ({totalPreparedQty}) for product {preparedProduct.ProductId} " +
                        $"does not match manifest quantity ({shipmentProduct.Quantity}). " +
                        $"To save partial progress, set IsFinishing to false.");
                }

                // Note: Products NOT in the original manifest are allowed (extra products added during preparation)
                // These will be added to ShipmentProducts with Quantity = 0 to indicate they were not originally declared

                // Validate each source location
                foreach (var sourceLocation in preparedProduct.SourceLocations)
                {
                    var warehouseEntry = await _db.ProductsInWarehouse
                        .FirstOrDefaultAsync(pw => pw.ProductId == preparedProduct.ProductId
                            && pw.LocationId == sourceLocation.LocationId, ct);

                    if (warehouseEntry == null || warehouseEntry.Quantity < sourceLocation.Quantity)
                    {
                        var availableQty = warehouseEntry?.Quantity ?? 0;
                        throw new InvalidOperationException(
                            $"Insufficient inventory for product {preparedProduct.ProductId} at location {sourceLocation.LocationId}. " +
                            $"Available: {availableQty}, Requested: {sourceLocation.Quantity}");
                    }
                }
            }

            // Process each prepared product
            foreach (var preparedProduct in dto.PreparedProducts)
            {
                // Check if product exists in shipment manifest
                var shipmentProduct = shipment.ShipmentProducts
                    .FirstOrDefault(sp => sp.ProductId == preparedProduct.ProductId);

                if (shipmentProduct == null)
                {
                    // Extra product not in manifest - add to ShipmentProducts
                    var totalPreparedQty = preparedProduct.SourceLocations.Sum(sl => sl.Quantity);
                    _db.ShipmentProducts.Add(new ShipmentProduct
                    {
                        ShipmentId = shipmentId,
                        ProductId = preparedProduct.ProductId,
                        Quantity = 0, // No declared quantity (extra product added during preparation)
                        CollectedQuantity = totalPreparedQty // Store prepared quantity in CollectedQuantity field
                    });
                }
                else if (!isFinishingPreparation)
                {
                    // When saving progress, update CollectedQuantity to reflect current preparation state
                    var totalPreparedQty = preparedProduct.SourceLocations.Sum(sl => sl.Quantity);
                    shipmentProduct.CollectedQuantity = totalPreparedQty;
                }

                foreach (var sourceLocation in preparedProduct.SourceLocations)
                {
                    // Decrease warehouse inventory (only if finishing, already handled for save progress above)
                    if (isFinishingPreparation)
                    {
                        var warehouseEntry = await _db.ProductsInWarehouse
                            .FirstOrDefaultAsync(pw => pw.ProductId == preparedProduct.ProductId
                                && pw.LocationId == sourceLocation.LocationId, ct);

                        if (warehouseEntry != null)
                        {
                            warehouseEntry.Quantity -= sourceLocation.Quantity;

                            // Remove entry if quantity reaches 0
                            if (warehouseEntry.Quantity == 0)
                            {
                                _db.ProductsInWarehouse.Remove(warehouseEntry);
                            }
                        }
                    }
                    else
                    {
                        // For save progress, reduce inventory temporarily
                        var warehouseEntry = await _db.ProductsInWarehouse
                            .FirstOrDefaultAsync(pw => pw.ProductId == preparedProduct.ProductId
                                && pw.LocationId == sourceLocation.LocationId, ct);

                        if (warehouseEntry != null)
                        {
                            warehouseEntry.Quantity -= sourceLocation.Quantity;

                            // Remove entry if quantity reaches 0
                            if (warehouseEntry.Quantity == 0)
                            {
                                _db.ProductsInWarehouse.Remove(warehouseEntry);
                            }
                        }
                    }

                    // Track source location in ShipmentProductLocation
                    _db.ShipmentProductLocations.Add(new ShipmentProductLocation
                    {
                        ShipmentId = shipmentId,
                        ProductId = preparedProduct.ProductId,
                        LocationId = sourceLocation.LocationId,
                        Quantity = sourceLocation.Quantity,
                        CreatedAt = DateTimeOffset.UtcNow,
                        ProcessedByUserId = userId
                    });
                }
            }

            // Update shipment dimensions
            if (dto.Weight.HasValue) shipment.Weight = dto.Weight.Value;
            if (dto.Length.HasValue) shipment.Length = dto.Length.Value;
            if (dto.Width.HasValue) shipment.Width = dto.Width.Value;
            if (dto.Height.HasValue) shipment.Height = dto.Height.Value;

            // Only change status to AwaitingPickup when finishing preparation
            // When saving progress (IsFinishing = false), status remains InPreparation
            if (isFinishingPreparation)
            {
                shipment.Status = ShipmentStatus.AwaitingPickup;
            }
            // else: status remains InPreparation (save progress without completing)

            await _db.SaveChangesAsync(ct);
        }

        // --- GET SHIPMENT PRODUCT PREPARATION (grouped by product) ---
        public async Task<List<GetShipmentProductPreparationGroupedDto>> GetShipmentProductPreparationAsync(int shipmentId, CancellationToken ct = default)
        {
            // Query ShipmentProductLocation for preparation data
            var preparationData = await _db.ShipmentProductLocations
                .AsNoTracking()
                .Where(spl => spl.ShipmentId == shipmentId)
                .Include(spl => spl.Product)
                .Include(spl => spl.Location)
                .OrderBy(spl => spl.Product.Name)
                .ToListAsync(ct);

            if (!preparationData.Any())
                return new List<GetShipmentProductPreparationGroupedDto>();

            // Get current quantities in all relevant locations
            var locationIds = preparationData.Select(spl => spl.LocationId).Distinct().ToList();
            var productIds = preparationData.Select(spl => spl.ProductId).Distinct().ToList();

            var currentInventory = await _db.ProductsInWarehouse
                .AsNoTracking()
                .Where(piw => locationIds.Contains(piw.LocationId) && productIds.Contains(piw.ProductId))
                .ToDictionaryAsync(piw => (piw.ProductId, piw.LocationId), piw => piw.Quantity, ct);

            // Group by product
            var grouped = preparationData
                .GroupBy(spl => new { spl.ProductId, spl.Product.Name, spl.Product.SKU })
                .Select(g => new GetShipmentProductPreparationGroupedDto
                {
                    ProductId = g.Key.ProductId,
                    ProductName = g.Key.Name,
                    ProductSku = g.Key.SKU,
                    TotalDeclaredQuantity = 0, // We'll need to query ShipmentProduct for this
                    TotalPreparedQuantity = g.Sum(spl => spl.Quantity),
                    SourceLocations = g.Select(spl => new PreparationLocationDto
                    {
                        LocationId = spl.LocationId,
                        LocationCode = spl.Location.LocationCode,
                        Quantity = spl.Quantity,
                        QuantityLeft = currentInventory.TryGetValue((spl.ProductId, spl.LocationId), out var qty) ? qty : 0
                    }).ToList()
                })
                .ToList();

            // Get declared quantities from ShipmentProduct
            var shipmentProducts = await _db.ShipmentProducts
                .AsNoTracking()
                .Where(sp => sp.ShipmentId == shipmentId && productIds.Contains(sp.ProductId))
                .ToDictionaryAsync(sp => sp.ProductId, sp => sp.Quantity, ct);

            // Fill in declared quantities
            foreach (var item in grouped)
            {
                if (shipmentProducts.TryGetValue(item.ProductId, out var declaredQty))
                {
                    item.TotalDeclaredQuantity = declaredQty;
                }
            }

            return grouped;
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
