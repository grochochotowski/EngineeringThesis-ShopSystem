using Microsoft.Web.WebView2.Core;
using System;
using System.IO;
using System.Windows;

namespace Desktop
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            Loaded += async (_, __) =>
            {
                try
                {
                    await Web.EnsureCoreWebView2Async();

#if DEBUG
                    // DEV: uruchom najpierw `npm run dev` w src/frontend
                    Web.Source = new Uri("http://localhost:5173");
#else
                    // PROD: ładuj z plików zbudowanych przez Vite (skopiowanych do /ui)
                    var uiDir = Path.Combine(AppContext.BaseDirectory, "ui");
                    var index = Path.Combine(uiDir, "index.html");
                    if (!File.Exists(index))
                        throw new FileNotFoundException("Brak plików UI (ui/index.html). Zrób npm run build i skopiuj dist do /ui.");
                    Web.Source = new Uri(index);
#endif
                }
                catch (Exception ex)
                {
                    MessageBox.Show(
                        "Nie udało się zainicjalizować WebView2.\n" +
#if DEBUG
                        "Czy działa frontend na http://localhost:5173 ?\n" +
#endif
                        ex.Message,
                        "Błąd startu", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            };
        }
    }
}
