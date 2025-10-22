using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;
using System.Net;

namespace Backend.Api.Objects.Entities
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Address> Addresses => Set<Address>();
        public DbSet<Category> Categories => Set<Category>();
        public DbSet<Client> Clients => Set<Client>();
        public DbSet<DeliveryCompany> DeliveryCompanies => Set<DeliveryCompany>();
        public DbSet<Parcel> Parcels => Set<Parcel>();
        public DbSet<Product> Products => Set<Product>();
        public DbSet<SalesDocument> SalesDocuments => Set<SalesDocument>();
        public DbSet<SalesDocumentItem> SalesDocumentItems => Set<SalesDocumentItem>();
        public DbSet<SalesPayment> SalesPayments => Set<SalesPayment>();
        public DbSet<Shipment> Shipments => Set<Shipment>();
        public DbSet<TaxRate> TaxRates => Set<TaxRate>();
        public DbSet<User> Users => Set<User>();
        public DbSet<Warehouse> Warehouses => Set<Warehouse>();

        public DbSet<WarehouseProduct> WarehouseProducts => Set<WarehouseProduct>();
        public DbSet<ParcelProduct> ParcelProducts => Set<ParcelProduct>();


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // CLIENT
            modelBuilder.Entity<Client>(b =>
            {
                b.HasIndex(x => x.Email).IsUnique();
                b.HasIndex(x => x.PhoneNumber).IsUnique();
                b.HasIndex(x => x.TaxId).IsUnique().HasFilter("[TaxId] IS NOT NULL");
            });

            // TAX RATE
            modelBuilder.Entity<TaxRate>(b =>
            {
                // Uwaga: jeśli w klasie masz 'code' z małej litery, użyj x => x.code
                b.HasIndex(x => x.Code).IsUnique();
                b.Property(x => x.Rate).HasPrecision(5, 4);
            });

            // PRODUCT
            modelBuilder.Entity<Product>(b =>
            {
                b.HasIndex(x => x.SKU).IsUnique();
                b.Property(x => x.Price).HasPrecision(18, 2);

                b.HasOne(x => x.Category)
                 .WithMany()
                 .HasForeignKey(x => x.CategoryId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.TaxRate)
                 .WithMany()
                 .HasForeignKey(x => x.TaxRateId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // SALES DOCUMENT (nagłówek)
            modelBuilder.Entity<SalesDocument>(b =>
            {
                b.HasIndex(x => new { x.DocumentType, x.DocumentNumber }).IsUnique();

                b.Property(x => x.TotalNet).HasPrecision(18, 2);
                b.Property(x => x.TotalTax).HasPrecision(18, 2);
                b.Property(x => x.TotalGross).HasPrecision(18, 2);
            });

            // SALES DOCUMENT ITEM (pozycje)
            modelBuilder.Entity<SalesDocumentItem>(b =>
            {
                b.HasIndex(x => x.SalesDocumentId);
                b.HasIndex(x => x.ProductId);
                b.HasIndex(x => x.TaxRateId);

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
            });

            // SALES PAYMENT (płatności)
            modelBuilder.Entity<SalesPayment>(b =>
            {
                b.HasIndex(x => x.SalesDocumentId);
                b.Property(x => x.Amount).HasPrecision(18, 2);

                b.HasOne(x => x.SalesDocument)
                 .WithMany(d => d.Payments)
                 .HasForeignKey(x => x.SalesDocumentId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // WAREHOUSE <-> PRODUCT (N:N)
            modelBuilder.Entity<WarehouseProduct>(b =>
            {
                b.HasKey(x => new { x.WarehouseId, x.ProductId });

                b.HasOne(x => x.Warehouse)
                 .WithMany(w => w.WarehouseProducts)
                 .HasForeignKey(x => x.WarehouseId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(x => x.Product)
                 .WithMany(p => p.WarehouseProducts)
                 .HasForeignKey(x => x.ProductId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // WAREHOUSE -> ADDRESS (1:1)
            modelBuilder.Entity<Warehouse>(b =>
            {
                b.HasOne(x => x.Address)
                 .WithOne()
                 .HasForeignKey<Warehouse>(x => x.AddressId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // DELIVERY COMPANY -> ADDRESS (1:1)
            modelBuilder.Entity<DeliveryCompany>(b =>
            {
                b.HasOne(x => x.Address)
                 .WithOne()
                 .HasForeignKey<DeliveryCompany>(x => x.AddressId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // SHIPMENT -> PARCEL (1:N)
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
            });

            // PARCEL <-> PRODUCT (N:N)
            modelBuilder.Entity<ParcelProduct>(b =>
            {
                b.ToTable("ParcelProduct");
                b.HasKey(x => new { x.ParcelId, x.ProductId });

                b.HasOne(x => x.Parcel)
                 .WithMany(p => p.ParcelProducts)
                 .HasForeignKey(x => x.ParcelId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(x => x.Product)
                 .WithMany(p => p.ParcelProducts)
                 .HasForeignKey(x => x.ProductId)
                 .OnDelete(DeleteBehavior.Cascade);
            });
        }

    }
}
