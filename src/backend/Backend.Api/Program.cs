using Backend.Api.Api.Controllers;
using Backend.Api.Api.Services;
using Backend.Api.Infrastructure;
using Backend.Api.Objects.Entities;
using Microsoft.EntityFrameworkCore;
using System;

namespace Backend.Api
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            builder.Services.AddDbContext<AppDbContext>(opt => opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
            builder.Services.AddTransient<DbSeeder>();
            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            builder.Services.AddScoped<IAddressService, AddressService>();

            builder.Services.AddScoped<ICategoryService, CategoryService>();
            builder.Services.AddScoped<IClientService, ClientService>();
            builder.Services.AddScoped<IDeliveryCompaniesService, DeliveryCompaniesService>();
            builder.Services.AddScoped<IParcelsService, ParcelsService>();
            builder.Services.AddScoped<IProductService, ProductService>();
            builder.Services.AddScoped<IShipmentService, ShipmentService>();
            builder.Services.AddScoped<ITaxRateService, TaxRateService>();
            builder.Services.AddScoped<IUsersService, UsersService>();


            
            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();
            app.UseAuthorization();
            app.MapControllers();
            app.Run();
        }
    }
}
