using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Client.Platforms.Features.DesktopOs.Kerberos;
using System.Net;

namespace Backend.Api.Objects.Entities
{
    public class AppDbContext : DbContext
    {
        // --- Constructor ---
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // --- DbSets ---
        public DbSet<Address>           Addresses           => Set<Address>();
        public DbSet<Category>          Categories          => Set<Category>();
        public DbSet<Client>            Clients             => Set<Client>();
        public DbSet<InventoryChange>   InventoryChanges    => Set<InventoryChange>();
        public DbSet<Location>          Locations           => Set<Location>();
        public DbSet<Product>           Products            => Set<Product>();
        public DbSet<RefreshToken>      RefreshTokens       => Set<RefreshToken>();
        public DbSet<SalesDocument>     SalesDocuments      => Set<SalesDocument>();
        public DbSet<SalesDocumentItem> SalesDocumentItems  => Set<SalesDocumentItem>();
        public DbSet<SalesPayment>      SalesPayments       => Set<SalesPayment>();
        public DbSet<Shipment>          Shipments           => Set<Shipment>();
        public DbSet<TaxRate>           TaxRates            => Set<TaxRate>();
        public DbSet<User>              Users               => Set<User>();
        public DbSet<UserCredential>    UserCredentials     => Set<UserCredential>();

        // --- Relation DbSets ---
        public DbSet<ProductsInWarehouse>        ProductsInWarehouse        => Set<ProductsInWarehouse>();
        public DbSet<ShipmentProduct>            ShipmentProducts           => Set<ShipmentProduct>();
        public DbSet<ShipmentProductLocation>    ShipmentProductLocations   => Set<ShipmentProductLocation>();



        // --- Model Creating ---
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // address
            modelBuilder.Entity<Address>(b =>
            {
                        b.HasIndex(x => new { x.Country, x.City, x.PostalCode, x.Street, x.Building, x.Premises }).IsUnique();
                
                        b.Property(x => x.Country)
                            .HasConversion<string>()
                            .HasMaxLength(64);
                            
                        b.Property(x => x.City).HasMaxLength(64);
                        b.Property(x => x.PostalCode).HasMaxLength(16);
                        b.Property(x => x.Street).HasMaxLength(128);
                        b.Property(x => x.Building).HasMaxLength(16);
                        b.Property(x => x.Premises).HasMaxLength(16);
                    });
            // category
            modelBuilder.Entity<Category>(b =>
            {
                b.HasIndex(x => x.Name).IsUnique();

                b.Property(x => x.Name).HasMaxLength(64);
                b.Property(x => x.Description).HasMaxLength(256);
                b.Property(x => x.IsActive).HasDefaultValue(true);
            });

            // client
            modelBuilder.Entity<Client>(b =>
            {
                b.HasIndex(x => x.Email).IsUnique();
                b.HasIndex(x => x.PhoneNumber).IsUnique();
                b.HasIndex(x => x.TaxId).IsUnique().HasFilter("[TaxId] IS NOT NULL"); ;

                b.Property(x => x.Name).HasMaxLength(128);
                b.Property(x => x.TaxId).HasMaxLength(32);
                b.Property(x => x.Email).HasMaxLength(64);
                b.Property(x => x.PhoneNumber).HasMaxLength(32);

                b.HasOne(x => x.Address)
                 .WithMany()
                 .HasForeignKey(x => x.AddressId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // inventory change
            modelBuilder.Entity<InventoryChange>(b =>
            {
                // Indexes for common queries
                b.HasIndex(x => x.ProductId);
                b.HasIndex(x => x.UserId);
                b.HasIndex(x => x.Timestamp);
                b.HasIndex(x => x.ChangeType);
                b.HasIndex(x => x.FromLocationId);
                b.HasIndex(x => x.ToLocationId);

                // String length configurations
                b.Property(x => x.ProductSku).HasMaxLength(64).IsRequired();
                b.Property(x => x.ProductEan).HasMaxLength(64);
                b.Property(x => x.Notes).HasMaxLength(512);

                // Enum conversion
                b.Property(x => x.ChangeType).HasConversion<string>().HasMaxLength(32);

                // Default timestamp to UTC now
                b.Property(x => x.Timestamp).HasDefaultValueSql("GETUTCDATE()");

                // Relationships
                b.HasOne(x => x.Product)
                 .WithMany()
                 .HasForeignKey(x => x.ProductId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.FromLocation)
                 .WithMany()
                 .HasForeignKey(x => x.FromLocationId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.ToLocation)
                 .WithMany()
                 .HasForeignKey(x => x.ToLocationId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.User)
                 .WithMany()
                 .HasForeignKey(x => x.UserId)
                 .OnDelete(DeleteBehavior.Restrict);

                // Check constraints
                b.ToTable(t =>
                {
                    // At least one of FromLocationId or ToLocationId must be non-null
                    t.HasCheckConstraint("CK_InventoryChange_Location_Required",
                        "[FromLocationId] IS NOT NULL OR [ToLocationId] IS NOT NULL");

                    // Quantity must be non-zero (positive or negative)
                    t.HasCheckConstraint("CK_InventoryChange_Qty_NonZero",
                        "[Quantity] != 0");
                });
            });


            // product
            modelBuilder.Entity<Product>(b =>
            {
                b.HasIndex(x => x.SKU).IsUnique();

                b.Property(x => x.SKU).HasMaxLength(64);
                b.Property(x => x.Name).HasMaxLength(64);
                b.Property(x => x.Description).HasMaxLength(256);
                b.Property(x => x.Price).HasPrecision(18, 2);

                b.Property(x => x.DefectDescription).HasMaxLength(256);
                b.Property(x => x.Defective).HasDefaultValue(false);

                b.HasOne(x => x.Category)
                 .WithMany()
                 .HasForeignKey(x => x.CategoryId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.TaxRate)
                 .WithMany()
                 .HasForeignKey(x => x.TaxRateId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_Product_Price_NonNegative", "[Price] >= 0");
                });
            });

            // refresh token
            modelBuilder.Entity<RefreshToken>(b =>
            {
                b.HasIndex(x => x.Token).IsUnique();
                b.Property(x => x.Token).HasMaxLength(256);

                b.HasOne(x => x.User)
                 .WithMany(u => u.RefreshTokens)
                 .HasForeignKey(x => x.UserId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // sales document
            modelBuilder.Entity<SalesDocument>(b =>
            {
                
                b.HasIndex(x => new { x.DocumentNumber }).IsUnique();

                b.Property(x => x.Description).HasMaxLength(256);
                b.Property(x => x.DocumentNumber).HasMaxLength(64);

                b.Property(x => x.TotalNet).HasPrecision(18, 2);
                b.Property(x => x.TotalTax).HasPrecision(18, 2);
                b.Property(x => x.TotalGross).HasPrecision(18, 2);

                b.HasOne(x => x.Client)
                 .WithMany()
                 .HasForeignKey(x => x.ClientId)
                 .OnDelete(DeleteBehavior.SetNull);

                b.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_SalesDocument_PositiveTotals",
                        "[TotalNet] >= 0 AND [TotalTax] >= 0 AND [TotalGross] >= 0");
                });
            });

            // sales document item
            modelBuilder.Entity<SalesDocumentItem>(b =>
            {
                b.HasIndex(x => x.SalesDocumentId);
                b.HasIndex(x => x.ProductId);
                b.HasIndex(x => x.TaxRateId);

                b.Property(x => x.ProductName).HasMaxLength(128);
                b.Property(x => x.ProductSKU).HasMaxLength(64);
                b.Property(x => x.UnitPriceNet).HasPrecision(18, 4);
                b.Property(x => x.LineNet).HasPrecision(18, 2);
                b.Property(x => x.LineTax).HasPrecision(18, 2);
                b.Property(x => x.LineGross).HasPrecision(18, 2);

                b.HasOne(x => x.SalesDocument)
                 .WithMany(d => d.Items)
                 .HasForeignKey(x => x.SalesDocumentId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(x => x.Product)
                 .WithMany()
                 .HasForeignKey(x => x.ProductId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.TaxRate)
                 .WithMany()
                 .HasForeignKey(x => x.TaxRateId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_SalesItem_Qty_Positive", "[Quantity] >= 1");
                    t.HasCheckConstraint("CK_SalesItem_Line_Positive",
                        "[LineNet] >= 0 AND [LineTax] >= 0 AND [LineGross] >= 0");
                });
            });

            // sales payment
            modelBuilder.Entity<SalesPayment>(b =>
            {
                b.HasIndex(x => x.SalesDocumentId);

                b.Property(x => x.Amount).HasPrecision(18, 2);
                b.Property(x => x.AmountTendered).HasPrecision(18, 2);
                b.Property(x => x.Change).HasPrecision(18, 2);

                b.HasOne(x => x.SalesDocument)
                 .WithMany(d => d.Payments)
                 .HasForeignKey(x => x.SalesDocumentId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_SalesPayment_Amount_Positive", "[Amount] >= 0");
                    t.HasCheckConstraint("CK_SalesPayment_AmountTendered_NonNegative", "[AmountTendered] IS NULL OR [AmountTendered] >= 0");
                    t.HasCheckConstraint("CK_SalesPayment_Change_NonNegative", "[Change] IS NULL OR [Change] >= 0");
                });
            });

            // shipment
            modelBuilder.Entity<Shipment>(b =>
            {
                // string length configurations
                b.Property(x => x.Description).HasMaxLength(256);
                b.Property(x => x.SenderName).HasMaxLength(128);
                b.Property(x => x.SenderTaxId).HasMaxLength(32);
                b.Property(x => x.SenderDetails).HasMaxLength(512);
                b.Property(x => x.ReceiverName).HasMaxLength(128);
                b.Property(x => x.ReceiverTaxId).HasMaxLength(32);
                b.Property(x => x.ReceiverDetails).HasMaxLength(512);

                // decimal precision for dimensions and weight
                b.Property(x => x.Weight).HasPrecision(18, 3);
                b.Property(x => x.Length).HasPrecision(18, 3);
                b.Property(x => x.Width).HasPrecision(18, 3);
                b.Property(x => x.Height).HasPrecision(18, 3);

                // enum conversion
                b.Property(x => x.Type).HasConversion<string>().HasMaxLength(32);
                b.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);

                // address relationships
                b.HasOne(x => x.SenderAddress)
                 .WithMany()
                 .HasForeignKey(x => x.SenderAddressId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.ReceiverAddress)
                 .WithMany()
                 .HasForeignKey(x => x.ReceiverAddressId)
                 .OnDelete(DeleteBehavior.Restrict);

                // check constraints
                b.ToTable(t =>
                {
                    // dates validation
                    t.HasCheckConstraint("CK_Shipment_Dates_Valid",
                        "[DeliveryDate] IS NULL OR [SendDate] IS NULL OR [DeliveryDate] >= [SendDate]");

                    // dimensions must be positive when set
                    t.HasCheckConstraint("CK_Shipment_Dims_Positive",
                        "[Weight] IS NULL OR [Length] IS NULL OR [Width] IS NULL OR [Height] IS NULL OR " +
                        "([Weight] > 0 AND [Length] > 0 AND [Width] > 0 AND [Height] > 0)");

                    // status-based validations for InPreparation, Collected, and Unspecified
                    // When status is AwaitingPickup or higher (except Collected), certain fields are required
                    // Collected (incoming only) does not require these fields yet
                    t.HasCheckConstraint("CK_Shipment_Status_Ready_Fields",
                        "[Status] IN ('Unspecified', 'InPreparation', 'Collected') OR " +
                        "([Weight] IS NOT NULL AND [Length] IS NOT NULL AND [Width] IS NOT NULL AND [Height] IS NOT NULL AND " +
                        "[SenderName] IS NOT NULL AND [ReceiverName] IS NOT NULL AND " +
                        "[SenderAddressId] IS NOT NULL AND [ReceiverAddressId] IS NOT NULL)");

                    // When status is InTransit or Delivered, SendDate is required (auto-set if not provided)
                    t.HasCheckConstraint("CK_Shipment_Status_Sent_Date",
                        "[Status] NOT IN ('InTransit', 'Delivered') OR [SendDate] IS NOT NULL");

                    // When status is Delivered, DeliveryDate is required
                    t.HasCheckConstraint("CK_Shipment_Status_Delivered_Date",
                        "[Status] != 'Delivered' OR [DeliveryDate] IS NOT NULL");
                });
            });

            // tax rate
            modelBuilder.Entity<TaxRate>(b =>
            {
                b.HasIndex(x => x.Code).IsUnique();

                b.Property(x => x.Code).HasMaxLength(16);
                b.Property(x => x.Rate).HasPrecision(5, 4);
                b.Property(x => x.IsActive).HasDefaultValue(true);

                b.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_TaxRate_0_1", "[Rate] >= 0 AND [Rate] <= 1");
                });
            });

            // user
            modelBuilder.Entity<User>(b =>
            {
                b.HasIndex(x => x.Email).IsUnique();
                b.HasIndex(x => x.PhoneNumber).IsUnique();

                b.Property(x => x.FirstName).HasMaxLength(64);
                b.Property(x => x.LastName).HasMaxLength(64);
                b.Property(x => x.Email).HasMaxLength(64);
                b.Property(x => x.PhoneNumber).HasMaxLength(32);

                b.HasOne(x => x.Address)
                 .WithOne()
                 .HasForeignKey<User>(x => x.AddressId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // user credentials
            modelBuilder.Entity<UserCredential>(b =>
            {
                b.HasKey(x => x.UserId);
                b.HasIndex(x => x.Login).IsUnique();

                b.Property(x => x.Login).HasMaxLength(64);
                b.Property(x => x.PasswordHash).HasMaxLength(256);
                b.Property(x => x.PasswordSalt).HasMaxLength(256);

                b.HasOne(x => x.User)
                 .WithOne(u => u.Credentials)
                 .HasForeignKey<UserCredential>(x => x.UserId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // location
            modelBuilder.Entity<Location>(b =>
            {
                b.HasIndex(x => x.LocationCode).IsUnique();

                b.Property(x => x.Zone).HasMaxLength(4).IsRequired();
                b.Property(x => x.Col).HasMaxLength(4).IsRequired();
                b.Property(x => x.Shelf).HasMaxLength(4).IsRequired();
                b.Property(x => x.LocationCode).HasMaxLength(14).IsRequired();
                b.Property(x => x.IsActive).HasDefaultValue(true);

                b.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_Location_Zone_Length", "LEN([Zone]) <= 4");
                    t.HasCheckConstraint("CK_Location_Col_Length", "LEN([Col]) <= 4");
                    t.HasCheckConstraint("CK_Location_Shelf_Length", "LEN([Shelf]) <= 4");
                });
            });

            // products-in-warehouse
            modelBuilder.Entity<ProductsInWarehouse>(b =>
            {
                b.HasKey(x => new { x.ProductId, x.LocationId });

                b.HasOne(x => x.Product)
                 .WithMany(p => p.ProductsInWarehouse)
                 .HasForeignKey(x => x.ProductId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.Location)
                 .WithMany(l => l.Products)
                 .HasForeignKey(x => x.LocationId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_ProductsInWarehouse_Qty_NonNegative", "[Quantity] >= 0");
                });
            });

            // shipment-product
            modelBuilder.Entity<ShipmentProduct>(b =>
            {
                b.HasKey(x => new { x.ShipmentId, x.ProductId });

                b.HasOne(x => x.Shipment)
                 .WithMany(s => s.ShipmentProducts)
                 .HasForeignKey(x => x.ShipmentId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(x => x.Product)
                 .WithMany(p => p.ShipmentProducts)
                 .HasForeignKey(x => x.ProductId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.ToTable(t =>
                {
                    // Declared quantity can be 0 for extra products collected during incoming shipment
                    t.HasCheckConstraint("CK_ShipmentProduct_Qty_NonNegative", "[Quantity] >= 0");
                    // CollectedQuantity can be NULL (not collected), 0 (collected but not received), or positive
                    t.HasCheckConstraint("CK_ShipmentProduct_CollectedQty_NonNegative",
                        "[CollectedQuantity] IS NULL OR [CollectedQuantity] >= 0");
                });
            });

            // shipment-product-location
            modelBuilder.Entity<ShipmentProductLocation>(b =>
            {
                b.HasKey(x => x.Id);

                b.HasIndex(x => new { x.ShipmentId, x.ProductId, x.LocationId });

                b.HasOne(x => x.Shipment)
                 .WithMany()
                 .HasForeignKey(x => x.ShipmentId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(x => x.Product)
                 .WithMany()
                 .HasForeignKey(x => x.ProductId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.Location)
                 .WithMany()
                 .HasForeignKey(x => x.LocationId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.ProcessedByUser)
                 .WithMany()
                 .HasForeignKey(x => x.ProcessedByUserId)
                 .OnDelete(DeleteBehavior.SetNull);

                b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

                b.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_ShipmentProductLocation_Qty_Positive", "[Quantity] > 0");
                });
            });
        }
    }
}
