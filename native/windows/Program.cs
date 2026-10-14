using System.Diagnostics;
using System.IO.Compression;
using System.Reflection;
using System.Security.Cryptography;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

static class Program {
    [STAThread] static void Main(string[] args) {
        try {
            var assets = ExtractAssets();
            if (args.Contains("--self-test")) { if (!File.Exists(Path.Combine(assets,"index.html"))) throw new Exception("Missing web assets"); return; }
            ApplicationConfiguration.Initialize();
            Application.Run(new Studio(assets));
        } catch (Exception error) { MessageBox.Show("Kinematika sa nedá spustiť.\n" + error.Message, "Kinematika Studio", MessageBoxButtons.OK, MessageBoxIcon.Error); Environment.ExitCode=1; }
    }
    static string ExtractAssets() {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("Kinematika.Web.zip") ?? throw new Exception("Missing embedded assets");
        using var buffer = new MemoryStream(); stream.CopyTo(buffer); var bytes=buffer.ToArray();
        var hash=Convert.ToHexString(SHA256.HashData(bytes));
        var root=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"KinematikaStudio","Assets",hash);
        if (File.Exists(Path.Combine(root,".complete"))) return root;
        Directory.CreateDirectory(root);
        using var archive=new ZipArchive(new MemoryStream(bytes));
        foreach(var entry in archive.Entries) {
            var path=Path.GetFullPath(Path.Combine(root,entry.FullName));
            if(!path.StartsWith(root+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase)) throw new Exception("Invalid asset path");
            if(entry.Name.Length==0) { Directory.CreateDirectory(path); continue; }
            Directory.CreateDirectory(Path.GetDirectoryName(path)!); entry.ExtractToFile(path,true);
        }
        File.WriteAllText(Path.Combine(root,".complete"),"ok"); return root;
    }
}
sealed class Studio : Form {
    readonly WebView2 web=new() { Dock=DockStyle.Fill };
    const string Origin="https://kinematika.desktop.local";
    public Studio(string assets) {
        Text="Kinematika Studio"; Width=1400; Height=900; MinimumSize=new(480,600); Controls.Add(web);
        Shown += async (_,_) => {
            try {
                var profile=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"KinematikaStudio","WebView2");
                var environment=await CoreWebView2Environment.CreateAsync(null,profile);
                await web.EnsureCoreWebView2Async(environment);
                web.CoreWebView2.SetVirtualHostNameToFolderMapping("kinematika.desktop.local",assets,CoreWebView2HostResourceAccessKind.DenyCors);
                web.CoreWebView2.Settings.AreDefaultContextMenusEnabled=false;
                web.CoreWebView2.NavigationStarting += (_,e) => { if(!IsLocal(e.Uri)) { e.Cancel=true; OpenExternal(e.Uri); } };
                web.CoreWebView2.NewWindowRequested += (_,e) => { e.Handled=true; OpenExternal(e.Uri); };
                web.CoreWebView2.PermissionRequested += (_,e) => {
                    if(e.PermissionKind.ToString()=="LocalNetworkAccess") e.State=MessageBox.Show(this,"Povoliť pripojenie k lokálnemu doplnku Fusion?","Lokálna sieť",MessageBoxButtons.YesNo)==DialogResult.Yes ? CoreWebView2PermissionState.Allow : CoreWebView2PermissionState.Deny;
                };
                web.Source=new Uri(Origin+"/index.html");
            } catch(WebView2RuntimeNotFoundException) {
                if(MessageBox.Show(this,"Nainštalujte Microsoft Edge WebView2 Runtime. Otvoriť stránku na stiahnutie?","Chýba WebView2",MessageBoxButtons.YesNo)==DialogResult.Yes) OpenExternal("https://developer.microsoft.com/microsoft-edge/webview2/");
                Close();
            } catch(Exception error) { MessageBox.Show(this,error.Message,"Chyba spustenia"); Close(); }
        };
    }
    static bool IsLocal(string value) => Uri.TryCreate(value,UriKind.Absolute,out var uri) && uri.Scheme=="https" && uri.Host=="kinematika.desktop.local";
    static void OpenExternal(string value) { if(Uri.TryCreate(value,UriKind.Absolute,out var uri) && uri.Scheme=="https") Process.Start(new ProcessStartInfo(value) { UseShellExecute=true }); }
}
