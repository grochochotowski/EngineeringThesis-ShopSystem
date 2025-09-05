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
        public DbSet<Shipment> Shipments => Set<Shipment>();
        public DbSet<User> Users => Set<User>();
        public DbSet<Warehouse> Warehouses => Set<Warehouse>();

        public DbSet<WarehouseProduct> WarehouseProducts => Set<WarehouseProduct>();


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // N:N warehouse-product whrough connector
            modelBuilder.Entity<WarehouseProduct>()
                .HasKey(wp => new { wp.WarehouseId, wp.ProductId });

            modelBuilder.Entity<WarehouseProduct>()
                .HasOne(wp => wp.Warehouse)
                .WithMany(w => w.WarehouseProducts)
                .HasForeignKey(wp => wp.WarehouseId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WarehouseProduct>()
                .HasOne(wp => wp.Product)
                .WithMany(p => p.WarehouseProducts)
                .HasForeignKey(wp => wp.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            // 1:1 Shipment–Parcel (FK in shipment)
            modelBuilder.Entity<Shipment>()
                .HasOne(s => s.Parcel)
                .WithOne()
                .HasForeignKey<Shipment>(s => s.ParcelId)
                .OnDelete(DeleteBehavior.Cascade);

            // 1:1 Warehouse–Address
            modelBuilder.Entity<Warehouse>()
                .HasOne(w => w.Address)
                .WithOne()
                .HasForeignKey<Warehouse>(w => w.AddressId)
                .OnDelete(DeleteBehavior.Restrict);

            // N:1 Product–Category
            modelBuilder.Entity<Product>()
                .HasOne(p => p.Category)
                .WithMany()
                .HasForeignKey(p => p.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            // N:1 Shipment–DeliveryCompany
            modelBuilder.Entity<Shipment>()
                .HasOne(s => s.DeliveryCompany)
                .WithMany()
                .HasForeignKey(s => s.DeliveryCompanyId)
                .OnDelete(DeleteBehavior.Restrict);

            // N:1 Shipment–Address (sender/receiver)
            modelBuilder.Entity<Shipment>()
                .HasOne(s => s.AddressSender)
                .WithMany()
                .HasForeignKey(s => s.AddressSenderId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Shipment>()
                .HasOne(s => s.AddressReceiver)
                .WithMany()
                .HasForeignKey(s => s.AddressReceiverId)
                .OnDelete(DeleteBehavior.Restrict);

            // N:N Product-Parcel
            modelBuilder.Entity<Parcel>()
                .HasMany(par => par.Products)
                .WithMany(pro => pro.Parcels)
                .UsingEntity(j => j.ToTable("ParcelProduct"));
        }
    }
}
