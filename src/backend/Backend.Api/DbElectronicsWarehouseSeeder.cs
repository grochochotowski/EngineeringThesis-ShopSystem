using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Enums;
using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace Backend.Api.Infrastructure
{
    /// <summary>
    /// Rich demo seeder focused on electronics, warehouse/store layout, and sales documents.
    /// It does not replace existing seeders; run explicitly when you need a dense dataset.
    /// </summary>
    public class DbElectronicsWarehouseSeeder
    {
        private readonly AppDbContext _db;
        private readonly Random _rand = new(42);

        public DbElectronicsWarehouseSeeder(AppDbContext db)
        {
            _db = db;
        }

        public void Seed()
        {
            if (!_db.Database.CanConnect()) return;

            var taxRates = EnsureTaxRates();
            var categories = EnsureCategories();
            var locations = EnsureLocations();
            var rootUserId = EnsureRootUser();
            var clients = EnsureClients();
            var products = EnsureProducts(categories, taxRates["VAT23"]);
            EnsureInventory(products, locations);
            var giftCards = EnsureGiftCards();
            EnsureSalesDocuments(products, clients, rootUserId, taxRates, giftCards);
        }

        private Dictionary<string, int> EnsureTaxRates()
        {
            var map = new Dictionary<string, int>();
            var desired = new List<(string code, decimal rate)>
            {
                ("VAT23", 0.23m),
                ("VAT8", 0.08m),
                ("VAT0", 0.00m)
            };

            foreach (var (code, rate) in desired)
            {
                var existing = _db.TaxRates.FirstOrDefault(t => t.Code == code);
                if (existing == null)
                {
                    existing = new TaxRate { Code = code, Rate = rate, IsActive = true };
                    _db.TaxRates.Add(existing);
                    _db.SaveChanges();
                }
                map[code] = existing.Id;
            }

            return map;
        }

        private Dictionary<string, int> EnsureCategories()
        {
            var names = new[]
            {
                "Computers",
                "Laptops",
                "Monitors",
                "Components",
                "Storage",
                "Networking",
                "Peripherals",
                "Audio",
                "Cellphones",
                "SmartHome",
                "LED Strips",
                "Accessories"
            };
            var map = new Dictionary<string, int>();
            foreach (var name in names)
            {
                var existing = _db.Categories.FirstOrDefault(c => c.Name == name);
                if (existing == null)
                {
                    existing = new Category { Name = name, Description = $"Category for {name}", IsActive = true };
                    _db.Categories.Add(existing);
                    _db.SaveChanges();
                }
                map[name] = existing.Id;
            }

            return map;
        }

        private List<Location> EnsureLocations()
        {
            var locations = new List<Location>();

            // Warehouse zones: more zones, 3 columns per zone, 6 shelves per column
            locations.AddRange(GenerateLocations("WZ", 15, "WC", 3, "WS", 6));
            // Store zones: up to 10 zones
            locations.AddRange(GenerateLocations("SZ", 8, "SC", 3, "SS", 6));

            foreach (var loc in locations)
            {
                var existing = _db.Locations.FirstOrDefault(l => l.LocationCode == loc.LocationCode);
                if (existing == null)
                {
                    _db.Locations.Add(loc);
                }
            }

            _db.SaveChanges();
            return _db.Locations.ToList();
        }

        private static IEnumerable<Location> GenerateLocations(string zonePrefix, int zoneCount, string colPrefix, int colsPerZone, string shelfPrefix, int shelvesPerCol)
        {
            var list = new List<Location>();
            for (int z = 1; z <= zoneCount; z++)
            {
                var zone = $"{zonePrefix}{z:00}";
                for (int c = 1; c <= colsPerZone; c++)
                {
                    var col = $"{colPrefix}{c:00}";
                    for (int s = 1; s <= shelvesPerCol; s++)
                    {
                        var shelf = $"{shelfPrefix}{s:00}";
                        list.Add(new Location
                        {
                            Zone = zone,
                            Col = col,
                            Shelf = shelf,
                            LocationCode = $"{zone}-{col}-{shelf}",
                            IsActive = true
                        });
                    }
                }
            }
            return list;
        }

        private int EnsureRootUser()
        {
            var root = _db.Users.Include(u => u.Credentials).FirstOrDefault(u => u.Role == UserRole.Root);
            if (root != null) return root.Id;

            CreatePasswordHash("Root123!", out var hash, out var salt);

            var address = new Address
            {
                Country = Country.Poland,
                City = "Warszawa",
                Street = "Admin Street",
                Building = "1",
                PostalCode = "00-000"
            };

            var user = new User
            {
                FirstName = "System",
                LastName = "Root",
                Email = "root@system.local",
                PhoneNumber = "000000000",
                DateOfBirth = DateTime.UtcNow.AddYears(-30),
                Role = UserRole.Root,
                Address = address,
                Credentials = new UserCredential
                {
                    Login = "root",
                    PasswordHash = Convert.ToBase64String(hash),
                    PasswordSalt = Convert.ToBase64String(salt),
                    IsActive = true
                }
            };

            _db.Users.Add(user);
            _db.SaveChanges();
            return user.Id;
        }

        private List<Client> EnsureClients()
        {
            if (_db.Clients.Any()) return _db.Clients.Include(c => c.Address).ToList();

            var clients = new List<Client>();
            var companySeeds = new[]
            {
                ("ComTech Solutions", "Warszawa", "00-101", "Grzybowska 1", "PL1234567890"),
                ("ElectroMax Polska", "Warszawa", "00-102", "Towarowa 2", "PL1234567891"),
                ("SmartHome Polska", "Warszawa", "00-103", "Koszykowa 3", "PL1234567892"),
                ("Pixel Mobile", "Kraków", "30-101", "Długa 4", "PL1234567893"),
                ("DataCore Systems", "Poznań", "60-101", "Głogowska 5", "PL1234567894"),
                ("BlueWave IT", "Gdańsk", "80-101", "Długa 6", "PL1234567895"),
                ("Nordic Logic", "Wrocław", "50-101", "Legnicka 7", "PL1234567896"),
                ("GreenByte", "Łódź", "90-101", "Piotrkowska 8", "PL1234567897"),
                ("NextGen Hardware", "Katowice", "40-101", "3 Maja 9", "PL1234567898"),
                ("SkyConnect", "Szczecin", "70-101", "Aleja Piastów 10", "PL1234567899"),
                ("HyperCompute", "Lublin", "20-101", "Krakowskie Przedmieście 11", "PL1234567800"),
                ("Vision Displays", "Bydgoszcz", "85-101", "Dworcowa 12", "PL1234567801"),
                ("CoreStorage", "Rzeszów", "35-101", "Rejtana 13", "PL1234567802"),
                ("RouterLink", "Białystok", "15-101", "Lipowa 14", "PL1234567803"),
                ("Peripheral House", "Opole", "45-101", "Ozimska 15", "PL1234567804"),
                ("AudioCraft", "Kielce", "25-101", "Sienkiewicza 16", "PL1234567805"),
                ("LED Studio", "Gdynia", "81-101", "Świętojańska 17", "PL1234567806"),
                ("Accessory Hub", "Olsztyn", "10-101", "Kościuszki 18", "PL1234567807")
            };

            var personSeeds = new[]
            {
                ("Jan", "Kowalski", "Warszawa", "00-201", "Mokotowska 1"),
                ("Anna", "Nowak", "Kraków", "30-201", "Zwierzyniecka 2"),
                ("Marek", "Zieliński", "Poznań", "60-201", "Kwiatowa 3"),
                ("Ewa", "Lewandowska", "Gdańsk", "80-201", "Szeroka 4"),
                ("Piotr", "Kaczmarek", "Wrocław", "50-201", "Świdnicka 5"),
                ("Katarzyna", "Wójcik", "Łódź", "90-201", "Tymienieckiego 6")
            };

            // Track existing emails/tax IDs to avoid unique constraint collisions
            var existingEmails = new HashSet<string>(_db.Clients.Select(c => c.Email));
            var existingTaxIds = new HashSet<string>(_db.Clients.Where(c => c.TaxId != null).Select(c => c.TaxId!));

            string NextEmail(string baseEmail)
            {
                if (!existingEmails.Contains(baseEmail))
                {
                    existingEmails.Add(baseEmail);
                    return baseEmail;
                }

                int counter = 1;
                while (true)
                {
                    var candidate = baseEmail.Replace("@", $".{counter}@");
                    if (!existingEmails.Contains(candidate))
                    {
                        existingEmails.Add(candidate);
                        return candidate;
                    }
                    counter++;
                }
            }

            string NextTaxId(string baseTaxId)
            {
                if (string.IsNullOrWhiteSpace(baseTaxId)) return baseTaxId;
                if (!existingTaxIds.Contains(baseTaxId))
                {
                    existingTaxIds.Add(baseTaxId);
                    return baseTaxId;
                }

                int counter = 1;
                while (true)
                {
                    var candidate = $"{baseTaxId}{counter}";
                    if (!existingTaxIds.Contains(candidate))
                    {
                        existingTaxIds.Add(candidate);
                        return candidate;
                    }
                    counter++;
                }
            }

            foreach (var (name, city, postal, street, tax) in companySeeds)
            {
                var emailBase = $"{name.Replace(" ", "").ToLower()}@{name.Replace(" ", "").ToLower()}.pl";
                clients.Add(new Client
                {
                    Name = name,
                    Email = NextEmail(emailBase),
                    PhoneNumber = $"5{_rand.Next(10000000, 99999999)}",
                    Type = ClientType.Company,
                    TaxId = NextTaxId(tax),
                    Address = BuildAddress(street, postal, city),
                    IsActive = true
                });
            }

            foreach (var (first, last, city, postal, street) in personSeeds)
            {
                var emailBase = $"{first.ToLower()}.{last.ToLower()}@mail.pl";
                clients.Add(new Client
                {
                    Name = $"{first} {last}",
                    Email = NextEmail(emailBase),
                    PhoneNumber = $"6{_rand.Next(10000000, 99999999)}",
                    Type = ClientType.Person,
                    Address = BuildAddress(street, postal, city),
                    IsActive = true
                });
            }

            _db.Clients.AddRange(clients);
            _db.SaveChanges();
            return clients;
        }

        private Address BuildAddress(string street, string postal, string city)
        {
            var (cleanStreet, building) = SplitStreetAndBuilding(street);
            var premises = _rand.NextDouble() > 0.7 ? $"{_rand.Next(1, 50)}" : null;

            return new Address
            {
                Country = Country.Poland,
                City = city,
                Street = cleanStreet,
                Building = building,
                Premises = premises,
                PostalCode = postal
            };
        }

        private static (string street, string building) SplitStreetAndBuilding(string raw)
        {
            // Expect "StreetName X" pattern; if missing, default to building "1"
            var parts = raw.Trim().Split(' ');
            if (parts.Length >= 2 && int.TryParse(parts.Last(), out _))
            {
                var building = parts.Last();
                var street = string.Join(' ', parts.Take(parts.Length - 1));
                return (street, building);
            }
            return (raw, "1");
        }

        private List<Product> EnsureProducts(Dictionary<string, int> categories, int vat23Id)
        {
            if (_db.Products.Count() >= 200) return _db.Products.Include(p => p.TaxRate).ToList();

            decimal PriceEnding99(decimal value)
            {
                var rounded = Math.Floor(value);
                return Math.Round(rounded + 0.99m, 2);
            }

            var definitions = new List<(string Category, string Name, string Description, decimal Price)>();

            void AddDefs(string category, IEnumerable<(string name, string desc, decimal price)> items, int? cap = null)
            {
                foreach (var (name, desc, price) in items)
                {
                    if (cap.HasValue && definitions.Count(d => d.Category == category) >= cap.Value) break;
                    definitions.Add((category, name, desc, PriceEnding99(price)));
                }
            }

            // Desktops
            AddDefs("Computers", new (string name, string desc, decimal price)[]
            {
                ("Desktop i5-10400 | RTX 3060 | 32GB | 1TB NVMe", "Mid-tower for design and gaming, Wi-Fi 6", 1299),
                ("Desktop i7-11700 | RTX 3070 | 32GB | 1TB NVMe + 2TB HDD", "Performance workstation, liquid cooling", 1699),
                ("Desktop Ryzen 5 5600X | RX 6700 XT | 32GB | 1TB NVMe", "AMD build for creative pros", 1399),
                ("Desktop Ryzen 7 5800X | RTX 3080 | 64GB | 2TB NVMe", "High-end render & gaming rig", 2199),
                ("SFF i5-12400 | Intel Arc A750 | 16GB | 512GB NVMe", "Compact office PC with triple display support", 899),
                ("Desktop i9-11900K | RTX 3090 | 64GB | 2TB NVMe", "Extreme performance for 3D workflows", 2999),
                ("Mini PC Ryzen 7 7735HS | Radeon 680M | 32GB | 1TB NVMe", "Small form factor with USB4", 1199),
                ("Desktop i7-13700 | RTX 4070 | 32GB | 1TB NVMe", "Balanced creator setup, Wi-Fi 6E", 1849),
                ("Desktop Ryzen 9 5900X | RTX 3080 Ti | 64GB | 2TB NVMe", "Studio-grade editing tower", 2499),
                ("Desktop i5-13600K | RTX 4060 Ti | 32GB | 1TB NVMe", "Solid midrange gaming/streaming PC", 1499),
            });

            // Laptops
            AddDefs("Laptops", new (string name, string desc, decimal price)[]
            {
                ("Laptop 14\" i5-1240P | Iris Xe | 16GB | 512GB NVMe", "Lightweight ultrabook, 1.2kg, Thunderbolt 4", 1099),
                ("Laptop 15\" i7-12700H | RTX 3060 | 32GB | 1TB NVMe", "Creator laptop with 165Hz display", 1699),
                ("Laptop 16\" Ryzen 7 6800H | RX 6700S | 32GB | 1TB NVMe", "Slim performance laptop with USB4", 1599),
                ("Laptop 13\" M2 | 16GB | 512GB", "Fanless portable with Retina display", 1499),
                ("Laptop 17\" i9-13900H | RTX 4080 | 64GB | 2TB NVMe", "Desktop replacement with mini-LED screen", 2999),
                ("Laptop 15\" Ryzen 5 7535HS | RTX 4050 | 16GB | 1TB NVMe", "Balanced gaming laptop with 144Hz", 1399),
                ("Laptop 14\" i7-1355U | Iris Xe | 16GB | 1TB NVMe", "Business ultrabook, 4G modem ready", 1199),
                ("Laptop 15\" i5-1335U | MX550 | 16GB | 512GB NVMe", "Everyday work laptop with HDMI 2.1", 999),
                ("Laptop 16\" i7-12700H | RTX 3070 Ti | 32GB | 1TB NVMe", "Performance mobile workstation", 1899),
                ("Laptop 13\" Ryzen 7 7730U | Radeon | 16GB | 512GB NVMe", "Ultralight with long battery life", 1049),
            });

            // Monitors
            AddDefs("Monitors", new (string name, string desc, decimal price)[]
            {
                ("Monitor 27\" 4K IPS 144Hz", "Factory-calibrated, 98% DCI-P3, USB-C 90W", 699),
                ("Monitor 34\" UWQHD 144Hz", "Curved gaming panel with HDR600", 649),
                ("Monitor 32\" QHD 165Hz", "Fast IPS, adjustable stand", 499),
                ("Monitor 27\" QHD 75Hz", "IPS office display with low blue light", 299),
                ("Monitor 49\" DQHD 120Hz", "Super ultrawide multitasking panel", 1199),
                ("Monitor 24\" FHD 75Hz", "Bezel-less office monitor", 199),
                ("Monitor 32\" 4K 60Hz", "USB-C docking, KVM switch", 549),
                ("Monitor 27\" 4K 60Hz", "Color-accurate creative display", 449),
                ("Monitor 25\" QHD 165Hz", "Esports-ready, fast IPS", 379),
                ("Monitor 29\" UW FHD 100Hz", "Productivity ultrawide with USB hub", 329),
            });

            // Components
            AddDefs("Components", new (string name, string desc, decimal price)[]
            {
                ("GPU GeForce RTX 4070 12GB", "Triple-fan cooler, dual BIOS", 699),
                ("GPU GeForce RTX 4060 Ti 8GB", "Compact dual-fan, PCIe 4.0", 499),
                ("GPU Radeon RX 7800 XT 16GB", "High-performance RDNA3, 3xDP 2.1", 599),
                ("CPU Intel Core i7-13700K", "16-core hybrid, unlocked", 449),
                ("CPU AMD Ryzen 7 7700X", "8-core Zen 4, AM5", 399),
                ("Motherboard Z790 ATX Wi-Fi 6E", "PCIe 5.0 GPU/SSD, DDR5", 349),
                ("Motherboard B650M mATX", "DDR5, PCIe 4.0, 2.5G LAN", 199),
                ("PSU 850W 80+ Gold Modular", "ATX 3.0, PCIe 5.0 cable", 189),
                ("PSU 750W 80+ Gold SFX", "Compact SFX-L, silent fan", 169),
                ("Cooling AIO 360mm ARGB", "LCD pump, LGA1700/AM5 ready", 229),
                ("Cooling Air Tower 120mm", "Dual-fan silent cooler", 99),
                ("Case ATX Mesh Front", "Tempered glass, 3x140mm ARGB", 149),
                ("Case mATX Compact", "Front USB-C, sound dampening", 119),
                ("RAM DDR5 32GB (2x16) 6000", "CL30 low-latency kit", 159),
                ("RAM DDR4 32GB (2x16) 3600", "RGB performance kit", 119),
            });

            // Storage
            AddDefs("Storage", new (string name, string desc, decimal price)[]
            {
                ("SSD NVMe 1TB PCIe 4.0", "Sequential read 7,000 MB/s", 129),
                ("SSD NVMe 2TB PCIe 4.0", "Sequential read 7,200 MB/s", 219),
                ("SSD NVMe 4TB PCIe 4.0", "High endurance TLC", 449),
                ("SSD SATA 1TB", "2.5\" drive, DRAM cache", 89),
                ("HDD 4TB 7200rpm", "Enterprise-grade, 256MB cache", 129),
                ("HDD 8TB 7200rpm", "NAS certified, 512MB cache", 199),
                ("Portable SSD 2TB USB 3.2", "Metal enclosure, 1050 MB/s", 179),
                ("Portable SSD 1TB USB-C", "Drop resistant, hardware encryption", 129),
                ("NAS 2-Bay Enclosure", "Quad-core CPU, 2.5G LAN", 299),
                ("NAS 4-Bay Enclosure", "8GB RAM, NVMe cache slots", 549),
            });

            // Networking
            AddDefs("Networking", new (string name, string desc, decimal price)[]
            {
                ("Router Wi-Fi 6E AXE5400", "Tri-band, 2.5G WAN, mesh-ready", 269),
                ("Router Wi-Fi 6 AX3000", "Dual-band, WPA3, QoS", 159),
                ("Mesh Kit Wi-Fi 6 AX1800 (3-Pack)", "Whole home coverage, app managed", 249),
                ("Switch 8-Port 2.5G", "Fanless metal chassis", 189),
                ("Switch 24-Port Gigabit PoE+", "370W budget, rackmount", 399),
                ("Access Point Wi-Fi 6 AX3600", "Ceiling mount, seamless roaming", 229),
                ("LTE Router Cat12", "Dual-SIM failover", 199),
                ("Fiber Media Converter Kit", "Gigabit SC single-mode", 99),
            });

            // Peripherals
            AddDefs("Peripherals", new (string name, string desc, decimal price)[]
            {
                ("Keyboard Mechanical TKL", "Hot-swap switches, per-key RGB", 149),
                ("Keyboard Low-Profile Wireless", "Bluetooth/2.4G, aluminum frame", 129),
                ("Mouse Wireless Ergo", "Silent clicks, 2.4G + BT", 79),
                ("Mouse Gaming 65g", "PAW3395 sensor, 8K polling", 119),
                ("Docking Station USB4", "2x HDMI, 2.5G LAN, 100W PD", 239),
                ("Webcam 4K HDR", "Auto-framing, dual mics", 199),
                ("USB-C Hub 8-in-1", "HDMI 4K60, SD reader", 89),
                ("Printer Laser Mono", "Duplex, Wi-Fi, 30ppm", 189),
                ("Printer Inkjet Color", "6-color photo printer, Wi-Fi", 249),
                ("UPS 1500VA", "Line-interactive, LCD display", 229),
            });

            // Audio
            AddDefs("Audio", new (string name, string desc, decimal price)[]
            {
                ("Headset Wireless ANC", "40mm drivers, BT 5.2 + dongle", 199),
                ("Headset Gaming 7.1 USB", "Detachable mic, fabric pads", 129),
                ("Soundbar 2.1 Dolby Atmos", "HDMI eARC, wireless sub", 349),
                ("Studio Monitors 5\"", "Balanced TRS inputs, 50W", 229),
                ("DAC/AMP USB Desktop", "Balanced output, gain stages", 159),
                ("Microphone USB Condenser", "Cardioid, mute button, pop filter", 119),
                ("Earbuds ANC", "Transparency mode, wireless charging", 149),
                ("Conference Speakerphone", "360° mic, USB-C + BT", 179),
            });

            // Cellphones
            AddDefs("Cellphones", new (string name, string desc, decimal price)[]
            {
                ("Smartphone 6.7\" OLED | Snapdragon 8 Gen 2 | 12/256", "120Hz, 50MP OIS, 5000mAh", 1099),
                ("Smartphone 6.1\" OLED | A16 | 6/256", "MagSafe, IP68", 999),
                ("Smartphone 6.8\" AMOLED | Exynos | 12/512", "S-Pen, 200MP camera", 1299),
                ("Smartphone 6.5\" OLED | Snapdragon 7+ | 8/128", "120Hz, stereo speakers", 699),
                ("Smartphone 6.4\" AMOLED | Dimensity 8200 | 12/256", "Curved display, 80W charge", 749),
                ("Smartphone 6.6\" IPS | Snapdragon 4 Gen 1 | 6/128", "90Hz, 5000mAh", 399),
                ("Smartphone 6.7\" OLED | Snapdragon 8+ Gen 1 | 12/256", "Foldable clamshell, 120Hz", 1199),
                ("Smartphone 11\" Tablet | Snapdragon 870 | 8/256", "120Hz LCD, quad speakers", 599),
            });

            // SmartHome
            AddDefs("SmartHome", new (string name, string desc, decimal price)[]
            {
                ("Smart Hub Zigbee + Matter", "Thread border router, Wi-Fi 6", 129),
                ("Smart Thermostat", "Open window detection, schedules", 179),
                ("Smart Plug Wi-Fi 16A (4-Pack)", "Energy monitoring", 89),
                ("Smart Bulb E27 RGB (6-Pack)", "Voice control, tunable white", 99),
                ("Smart Roller Blind Motor", "Home automation ready", 149),
                ("Smart Door Lock", "Fingerprint + PIN, auto-lock", 229),
                ("Security Camera 2K PTZ", "AI detection, color night vision", 119),
                ("Video Doorbell 2K Battery", "Chime included, two-way audio", 149),
            });

            // LED Strips
            AddDefs("LED Strips", new (string name, string desc, decimal price)[]
            {
                ("LED Strip Kit 5m RGBIC", "Music sync, Wi-Fi + BT", 69),
                ("LED Strip Kit 10m RGBIC", "Zigbee/Matter compatible", 99),
                ("LED Neon Flex 3m", "Side-glow, indoor/outdoor", 89),
                ("LED PC ARGB Kit", "Motherboard sync, 2x50cm", 49),
                ("LED TV Backlight 65\"", "Ambient sync via camera", 79),
                ("LED Cabinet Light 4-Pack", "Motion sensor, USB-C", 59),
            });

            // Accessories
            AddDefs("Accessories", new (string name, string desc, decimal price)[]
            {
                ("Cable HDMI 2.1 3m", "48Gbps, Ultra High Speed certified", 29),
                ("Cable USB-C 240W 2m", "E-marker, 40Gbps", 24),
                ("Dock NVMe USB 3.2", "Tool-less enclosure, 10Gbps", 49),
                ("Surge Protector 8-Outlet", "4x USB, 2m cord", 39),
                ("Cleaning Kit Pro", "Isopropyl spray, microfiber, swabs", 19),
                ("Laptop Stand Aluminum", "Adjustable, foldable", 39),
                ("VESA Monitor Arm", "Gas spring, 27\" support", 79),
                ("Thermal Paste 12W/mK", "5g syringe, spatula", 12),
                ("Cable Management Sleeve", "Neoprene, 3m", 15),
                ("SATA Cable 3-Pack", "Locking latch, 50cm", 12),
                ("DisplayPort 1.4 Cable 2m", "8K60, DSC", 29),
                ("Wireless Charger 15W", "Stand, USB-C input", 39),
                ("Car Charger 67W", "Dual USB-C PPS", 34),
                ("Keyboard Wrist Rest", "Memory foam, anti-slip", 19),
                ("Mouse Pad XL", "900x400mm, stitched edges", 24),
                ("SD Card UHS-II 256GB", "V90, 300MB/s read", 199),
                ("USB Flash Drive 256GB", "USB 3.2 Gen2, metal body", 49),
                ("Tool Kit 46-in-1", "Precision bits for electronics", 39),
                ("Screen Protector Pack", "Universal cut-to-fit", 19),
                ("Cable Ties Reusable 100-Pack", "Hook-and-loop", 9),
                ("Power Bank 20,000mAh 65W", "USB-C PD, dual output", 69),
                ("Laptop Sleeve 15\"", "Water resistant, padded", 29),
                ("Headphone Stand", "Aluminum with cable holder", 25),
                ("NVMe Heatsink", "Aluminum, thermal pads included", 19),
                ("Wi-Fi Antenna Extension", "RP-SMA 2m", 14),
                ("Bluetooth Adapter USB", "BT 5.3, low latency", 24),
                ("Cable Tester", "RJ45/RJ11, LED indicator", 22),
                ("Label Printer", "USB-C, thermal, 203dpi", 79),
                ("Portable Monitor 15.6\" FHD", "USB-C powered, IPS", 229),
                ("Tripod Desk", "Clamp-on, ball head", 49),
            }, cap: null);

            // Ensure volume ~200 items by duplicating varied accessories if needed
            while (definitions.Count < 200)
            {
                definitions.Add(("Accessories", $"Accessory Bundle {definitions.Count + 1}", "Mixed accessories for electronics maintenance.", PriceEnding99(_rand.Next(25, 120))));
            }

            var products = new List<Product>();
            int skuCounter = 1;
            foreach (var def in definitions.Take(220)) // safety cap
            {
                var sku = $"ELC-{skuCounter:0000}";
                var ean = $"5909999{skuCounter:000000}";

                products.Add(new Product
                {
                    SKU = sku,
                    EAN = ean,
                    Name = def.Name,
                    Description = def.Description,
                    Price = def.Price,
                    CategoryId = categories[def.Category],
                    TaxRateId = vat23Id,
                    IsActive = true
                });
                skuCounter++;
                if (products.Count >= 200) break;
            }

            _db.Products.AddRange(products);
            _db.SaveChanges();
            return _db.Products.ToList();
        }

        private void EnsureInventory(List<Product> products, List<Location> locations)
        {
            if (_db.ProductsInWarehouse.Any()) return;

            var warehouseZones = locations.Where(l => l.Zone.StartsWith("WZ")).GroupBy(l => l.Zone).ToDictionary(g => g.Key, g => g.ToList());
            var storeZones = locations.Where(l => l.Zone.StartsWith("SZ")).GroupBy(l => l.Zone).ToDictionary(g => g.Key, g => g.ToList());
            var categoryLookup = _db.Categories.ToDictionary(c => c.Id, c => c.Name);

            var categoryZoneMap = new Dictionary<string, string>
            {
                { "Computers", "WZ01" },
                { "Laptops", "WZ02" },
                { "Monitors", "WZ03" },
                { "Components", "WZ04" },
                { "Storage", "WZ05" },
                { "Networking", "WZ06" },
                { "Peripherals", "WZ07" },
                { "Audio", "WZ08" },
                { "Cellphones", "WZ09" },
                { "SmartHome", "WZ10" },
                { "LED Strips", "WZ11" },
                { "Accessories", "WZ12" }
            };

            var entries = new List<ProductsInWarehouse>();
            foreach (var product in products)
            {
                var categoryName = categoryLookup.TryGetValue(product.CategoryId, out var name) ? name : "Accessories";
                var key = categoryZoneMap.ContainsKey(categoryName) ? categoryName : "Accessories";
                var zone = categoryZoneMap[key];
                var targetList = warehouseZones.ContainsKey(zone) ? warehouseZones[zone] : warehouseZones.Values.First();
                var loc = targetList[_rand.Next(targetList.Count)];

                entries.Add(new ProductsInWarehouse
                {
                    ProductId = product.Id,
                    LocationId = loc.Id,
                    Quantity = 20 + _rand.Next(0, 80)
                });

                // Optionally place some in store
                if (storeZones.Any() && _rand.NextDouble() > 0.4)
                {
                    var storeZoneKey = storeZones.Keys.ElementAt(_rand.Next(storeZones.Count));
                    var storeLoc = storeZones[storeZoneKey][_rand.Next(storeZones[storeZoneKey].Count)];
                    entries.Add(new ProductsInWarehouse
                    {
                        ProductId = product.Id,
                        LocationId = storeLoc.Id,
                        Quantity = 5 + _rand.Next(0, 20)
                    });
                }
            }

            _db.ProductsInWarehouse.AddRange(entries);
            _db.SaveChanges();
        }

        private List<GiftCard> EnsureGiftCards()
        {
            if (_db.GiftCards.Any()) return _db.GiftCards.ToList();

            var list = new List<GiftCard>();
            for (int i = 1; i <= 15; i++)
            {
                list.Add(new GiftCard
                {
                    Code = $"GC-{i:0000}",
                    Value = 50 + (i * 10),
                    DateIssued = DateTimeOffset.UtcNow.AddDays(-i),
                    DateValidUntil = DateTimeOffset.UtcNow.AddYears(1),
                    IsActive = i % 5 != 0 // deactivate every 5th
                });
            }

            _db.GiftCards.AddRange(list);
            _db.SaveChanges();
            return list;
        }

        private void EnsureSalesDocuments(List<Product> products, List<Client> clients, int userId, Dictionary<string, int> taxRates, List<GiftCard> giftCards)
        {
            if (_db.SalesDocuments.Any()) return;

            var docs = new List<SalesDocument>();
            var year = DateTime.UtcNow.Year;
            var salePrefix = $"S1C1/{year}/";
            var returnPrefix = $"S1C1/{year}/RR/";
            int nextSaleNumber = GetNextSequenceNumber(salePrefix, false);
            int nextReturnNumber = GetNextSequenceNumber(returnPrefix, true);

            // 50 sales documents
            for (int i = 0; i < 50; i++)
            {
                var isInvoice = i % 3 == 0;
                var client = isInvoice ? clients.Where(c => c.Type == ClientType.Company).OrderBy(_ => Guid.NewGuid()).First() : null;
                var selectedProducts = products.OrderBy(_ => Guid.NewGuid()).Take(3).ToList();

                var items = new List<SalesDocumentItem>();
                decimal totalGross = 0, totalTax = 0, totalNet = 0;
                foreach (var p in selectedProducts)
                {
                    var qty = 1 + _rand.Next(1, 4);
                    var gross = p.Price * qty;
                    var rate = _db.TaxRates.First(t => t.Id == p.TaxRateId).Rate;
                    var net = Math.Round(gross / (1 + rate), 2);
                    var tax = gross - net;

                    items.Add(new SalesDocumentItem
                    {
                        ProductId = p.Id,
                        ProductName = p.Name,
                        ProductSKU = p.SKU,
                        Quantity = qty,
                        UnitGross = p.Price,
                        TaxRateId = p.TaxRateId,
                        LineNet = net,
                        LineTax = tax,
                        LineGross = gross
                    });
                    totalGross += gross;
                    totalTax += tax;
                    totalNet += net;
                }

                var payments = BuildPayments(totalGross, giftCards);

                var docNumber = $"{salePrefix}{nextSaleNumber:D4}";
                nextSaleNumber++;
                var doc = new SalesDocument
                {
                    DocumentType = isInvoice ? SalesDocumentType.InvoiceCompany : SalesDocumentType.Receipt,
                    IssueDate = DateTimeOffset.UtcNow.AddDays(-i),
                    DocumentNumber = docNumber,
                    Description = isInvoice ? "Bulk electronics invoice" : "Retail electronics receipt",
                    ClientId = client?.Id,
                    UserId = userId,
                    Items = items,
                    Payments = payments,
                    TotalGross = totalGross,
                    TotalTax = totalTax,
                    TotalNet = totalNet
                };

                docs.Add(doc);
            }

            _db.SalesDocuments.AddRange(docs);
            _db.SaveChanges();

            // 5 returns referencing earlier documents
            var returns = new List<SalesDocument>();
            var originals = _db.SalesDocuments.OrderBy(d => d.Id).Take(5).ToList();
            foreach (var orig in originals)
            {
                var item = orig.Items.First();
                var qty = 1;
                var gross = item.UnitGross * qty * -1;
                var rate = _db.TaxRates.First(t => t.Id == item.TaxRateId).Rate;
                var net = Math.Round(gross / (1 + rate), 2);
                var tax = gross - net;

                var returnItem = new SalesDocumentItem
                {
                    ProductId = item.ProductId,
                    ProductName = item.ProductName,
                    ProductSKU = item.ProductSKU,
                    Quantity = -qty,
                    UnitGross = item.UnitGross,
                    TaxRateId = item.TaxRateId,
                    LineNet = net,
                    LineTax = tax,
                    LineGross = gross
                };

                var payment = new SalesPayment
                {
                    Amount = gross,
                    PaymentOption = PaymentOption.Cash,
                    Change = 0,
                    AmountTendered = gross
                };

                var docNumber = $"{returnPrefix}{nextReturnNumber:D4}";
                nextReturnNumber++;
                returns.Add(new SalesDocument
                {
                    DocumentType = orig.DocumentType == SalesDocumentType.InvoiceCompany ? SalesDocumentType.InvoiceReturn : SalesDocumentType.ReceiptReturn,
                    IssueDate = DateTimeOffset.UtcNow,
                    DocumentNumber = docNumber,
                    Description = "Return document",
                    ClientId = orig.ClientId,
                    OriginalDocumentId = orig.Id,
                    UserId = userId,
                    Items = new List<SalesDocumentItem> { returnItem },
                    Payments = new List<SalesPayment> { payment },
                    TotalGross = gross,
                    TotalTax = tax,
                    TotalNet = net
                });
            }

            _db.SalesDocuments.AddRange(returns);
            _db.SaveChanges();
        }

        private int GetNextSequenceNumber(string prefix, bool isReturn)
        {
            var existingNumbers = _db.SalesDocuments
                .Where(d => d.DocumentNumber.StartsWith(prefix))
                .Select(d => d.DocumentNumber)
                .ToList();

            var usedNumbers = existingNumbers
                .Select(docNum =>
                {
                    var parts = docNum.Split('/');
                    int expectedLength = isReturn ? 4 : 3;
                    int numberIndex = isReturn ? 3 : 2;

                    if (parts.Length == expectedLength && int.TryParse(parts[numberIndex], out int num))
                        return num;
                    return 0;
                })
                .Where(n => n > 0)
                .OrderBy(n => n)
                .ToList();

            int nextNumber = 1;
            foreach (var num in usedNumbers)
            {
                if (num == nextNumber)
                    nextNumber++;
                else
                    break;
            }

            return nextNumber;
        }

        private List<SalesPayment> BuildPayments(decimal totalGross, List<GiftCard> giftCards)
        {
            var payments = new List<SalesPayment>();
            var choice = _rand.Next(0, 3);

            switch (choice)
            {
                case 0:
                    payments.Add(new SalesPayment { PaymentOption = PaymentOption.Card, Amount = totalGross });
                    break;
                case 1:
                    payments.Add(new SalesPayment { PaymentOption = PaymentOption.Cash, Amount = totalGross, AmountTendered = totalGross + 5, Change = 5 });
                    break;
                default:
                    var split = Math.Round(totalGross * 0.6m, 2);
                    payments.Add(new SalesPayment { PaymentOption = PaymentOption.Card, Amount = split });
                    payments.Add(new SalesPayment { PaymentOption = PaymentOption.Cash, Amount = totalGross - split });
                    if (giftCards.Any() && _rand.NextDouble() > 0.7)
                    {
                        var gc = giftCards[_rand.Next(giftCards.Count)];
                        payments.Add(new SalesPayment
                        {
                            PaymentOption = PaymentOption.GiftCard,
                            Amount = Math.Min(50, totalGross - split),
                            GiftCardId = gc.Id
                        });
                    }
                    break;
            }

            return payments;
        }

        private static void CreatePasswordHash(string password, out byte[] hash, out byte[] salt)
        {
            using var hmac = new HMACSHA512();
            salt = hmac.Key;
            hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        }
    }
}
