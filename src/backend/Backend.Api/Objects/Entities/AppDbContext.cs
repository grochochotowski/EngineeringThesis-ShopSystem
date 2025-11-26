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
        public DbSet<DeliveryCompany>   DeliveryCompanies   => Set<DeliveryCompany>();
        public DbSet<Parcel>            Parcels             => Set<Parcel>();
        public DbSet<Product>           Products            => Set<Product>();
        public DbSet<RefreshToken>      RefreshTokens       => Set<RefreshToken>();
        public DbSet<SalesDocument>     SalesDocuments      => Set<SalesDocument>();
        public DbSet<SalesDocumentItem> SalesDocumentItems  => Set<SalesDocumentItem>();
        public DbSet<SalesPayment>      SalesPayments       => Set<SalesPayment>();
        public DbSet<Shipment>          Shipments           => Set<Shipment>();
        public DbSet<TaxRate>           TaxRates            => Set<TaxRate>();
        public DbSet<User>              Users               => Set<User>();
        public DbSet<UserCredential>    UserCredentials     => Set<UserCredential>();
        public DbSet<Warehouse>         Warehouses          => Set<Warehouse>();

        // --- Relation DbSets ---
        public DbSet<WarehouseProduct>  WarehouseProducts   => Set<WarehouseProduct>();
        public DbSet<ParcelProduct>     ParcelProducts      => Set<ParcelProduct>();



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

            // delivery company
            modelBuilder.Entity<DeliveryCompany>(b =>
            {
                b.HasIndex(x => x.Name).IsUnique();
                b.HasIndex(x => x.Email).IsUnique();
                b.HasIndex(x => x.PhoneNumber).IsUnique();

                b.Property(x => x.Name).HasMaxLength(64);
                b.Property(x => x.Email).HasMaxLength(64);
                b.Property(x => x.PhoneNumber).HasMaxLength(32);
                b.Property(d => d.IsActive).HasDefaultValue(true);

                b.HasOne(x => x.Address)
                 .WithOne()
                 .HasForeignKey<DeliveryCompany>(x => x.AddressId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // parcel
            modelBuilder.Entity<Parcel>(b =>
            {
                b.HasIndex(x => x.ShipmentId);
                b.Property(x => x.Description).HasMaxLength(256);
                b.Property(x => x.Weight).HasPrecision(18, 3);
                b.Property(x => x.Length).HasPrecision(18, 3);
                b.Property(x => x.Width).HasPrecision(18, 3);
                b.Property(x => x.Height).HasPrecision(18, 3);

                b.HasOne(x => x.Shipment)
                 .WithMany(s => s.Parcels)
                 .HasForeignKey(x => x.ShipmentId)
                 .OnDelete(DeleteBehavior.SetNull);

                b.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_Parcel_Weight_Positive", "[Weight] > 0");
                    t.HasCheckConstraint("CK_Parcel_Dims_Positive", "[Length] > 0 AND [Width] > 0 AND [Height] > 0");
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

                b.HasOne(x => x.SalesDocument)
                 .WithMany(d => d.Payments)
                 .HasForeignKey(x => x.SalesDocumentId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_SalesPayment_Amount_Positive", "[Amount] >= 0");
                });
            });

            // shipment
            modelBuilder.Entity<Shipment>(b =>
            {
                b.HasMany(x => x.Parcels)
                 .WithOne(p => p.Shipment)
                 .HasForeignKey(p => p.ShipmentId)
                 .OnDelete(DeleteBehavior.SetNull);

                b.HasOne(x => x.DeliveryCompany)
                 .WithMany()
                 .HasForeignKey(x => x.DeliveryCompanyId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.AddressSender)
                 .WithMany()
                 .HasForeignKey(x => x.AddressSenderId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.AddressReceiver)
                 .WithMany()
                 .HasForeignKey(x => x.AddressReceiverId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_Shipment_Dates_Valid", "[DeliveryDate] IS NULL OR [DeliveryDate] >= [SendDate]");
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

            // warehouse
            modelBuilder.Entity<Warehouse>(b =>
            {
                b.HasIndex(x => x.Name).IsUnique();

                b.Property(x => x.Name).HasMaxLength(128);

                b.HasOne(x => x.Address)
                 .WithOne()
                 .HasForeignKey<Warehouse>(x => x.AddressId)
                 .OnDelete(DeleteBehavior.Restrict);
            });


            // warehouse-product
            modelBuilder.Entity<WarehouseProduct>(b =>
            {
                b.HasKey(x => new { x.WarehouseId, x.ProductId });

                b.HasOne(x => x.Warehouse)
                 .WithMany(w => w.WarehouseProducts)
                 .HasForeignKey(x => x.WarehouseId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.Product)
                 .WithMany(p => p.WarehouseProducts)
                 .HasForeignKey(x => x.ProductId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_WarehouseProduct_Qty_NonNegative", "[Quantity] >= 0");
                });
            });

            // parcel-product
            modelBuilder.Entity<ParcelProduct>(b =>
            {
                b.HasKey(x => new { x.ParcelId, x.ProductId });

                b.HasOne(x => x.Parcel)
                 .WithMany(p => p.ParcelProducts)
                 .HasForeignKey(x => x.ParcelId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.Product)
                 .WithMany(p => p.ParcelProducts)
                 .HasForeignKey(x => x.ProductId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_ParcelProduct_Qty_Positive", "[Quantity] >= 1");
                });
            });
        }
    }
}
