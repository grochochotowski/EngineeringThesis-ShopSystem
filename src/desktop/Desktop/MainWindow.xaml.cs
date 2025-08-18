using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
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

                    Web.CoreWebView2.WebMessageReceived += (_, e) =>
                    {
                        var msg = e.TryGetWebMessageAsString();
                        MessageBox.Show($"From React: {msg}", "Desktop");
                        Web.CoreWebView2.PostWebMessageAsString("{\"ok\":true}");
                    };

#if DEBUG
                    try { Web.Source = new Uri("http://localhost:5173"); }
                    catch { Web.Source = new Uri(Path.Combine(AppContext.BaseDirectory, "ui", "index.html")); }
#else
                    Web.Source = new Uri(Path.Combine(AppContext.BaseDirectory, "ui", "index.html"));
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
