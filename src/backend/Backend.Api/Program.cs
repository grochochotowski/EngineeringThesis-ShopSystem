using Backend.Api.Api.Controllers;
using Backend.Api.Api.Services;
using Backend.Api.Infrastructure;
using Backend.Api.Objects.Entities;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Text;
using System.Text.Json.Serialization;

namespace Backend.Api
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // --- DATABASE ---
            builder.Services.AddDbContext<AppDbContext>(opt => opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
            builder.Services.AddTransient<DbSeeder>();
            builder.Services.AddTransient<DbExampleDataSeeder>();
            builder.Services.AddControllers().AddJsonOptions(o =>
            {
                o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });
            builder.Services.AddEndpointsApiExplorer();

            // --- CORS ---
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowedOrigins",
                    policy =>
                    {
                        policy
                            .WithOrigins("http://localhost:5173", "https://localhost:5173")
                            .AllowAnyHeader()
                            .AllowAnyMethod()
                            .AllowCredentials();
                    });
            });

            // --- SWAGGER WITH JWT AUTH ---
            builder.Services.AddSwaggerGen(options =>
            {
                options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    In = Microsoft.OpenApi.Models.ParameterLocation.Header,
                    Description = "Please insert JWT with Bearer into field. Example: Bearer {token}",
                    Name = "Authorization",
                    Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
                    BearerFormat = "JWT",
                    Scheme = "Bearer"
                });

                options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
                {
                    {
                        new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                        {
                            Reference = new Microsoft.OpenApi.Models.OpenApiReference
                            {
                                Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        new string[] {}
                    }
                });
            });

            // --- DEPENDENCY INJECTION ---
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
            builder.Services.AddScoped<IUsersService, UserService>();

            // --- JWT AUTHENTICATION ---
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

            // --- BUILD APP ---
            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }
            
            // --- USE CORS ---
            app.UseCors("AllowedOrigins");

            app.UseHttpsRedirection();
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();

            // --- SEED DATABASE ---
            using (var scope = app.Services.CreateScope())
            {
                // var seeder = scope.ServiceProvider.GetRequiredService<DbSeeder>();
                var seeder = scope.ServiceProvider.GetRequiredService<DbExampleDataSeeder>();
                seeder.Seed();
            }

            app.Run();
        }
    }
}
