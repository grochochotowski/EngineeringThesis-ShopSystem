using Backend.Api.Api.Controllers;
using Backend.Api.Api.Services;
using Backend.Api.Infrastructure;
using Backend.Api.Objects.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System;
using System.Text.Json.Serialization;

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
            builder.Services.AddControllers().AddJsonOptions(o =>
            {
                o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            builder.Services.AddScoped<IAddressService, AddressService>();
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<ICategoryService, CategoryService>();
            builder.Services.AddScoped<IClientService, ClientService>();
            builder.Services.AddScoped<IDeliveryCompaniesService, DeliveryCompaniesService>();
            builder.Services.AddScoped<IParcelsService, ParcelsService>();
            builder.Services.AddScoped<IProductService, ProductService>();
            builder.Services.AddScoped<ISalesDocumentService, SalesDocumentService>();
            builder.Services.AddScoped<ISalesDocumentItemService, SalesDocumentItemService>();
            builder.Services.AddScoped<ISalesPaymentService, SalesPaymentService>();
            builder.Services.AddScoped<IShipmentService, ShipmentService>();
            builder.Services.AddScoped<ITaxRateService, TaxRateService>();
            //builder.Services.AddScoped<IUsersService, UsersService>();
            builder.Services.AddScoped<IWarehouseService, WarehouseService>();

            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
            {
                var jwt = builder.Configuration.GetSection("Jwt");
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwt["Issuer"],
                    ValidAudience = jwt["Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!))
                };
            });

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();

            // --- SEED DATABASE ---
            using (var scope = app.Services.CreateScope())
            {
                var seeder = scope.ServiceProvider.GetRequiredService<DbSeeder>();
                seeder.Seed();
            }

            app.Run();
        }
    }
}
