using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
class Launcher {
 [STAThread] static void Main() {
  try {
   string root=AppDomain.CurrentDomain.BaseDirectory;
   string exe=Path.Combine(root,"win-unpacked","PaperWords.exe");
   if(!File.Exists(exe)) { MessageBox.Show("程序组件缺失，请保留 PaperWords.exe 旁的 win-unpacked 文件夹。","PaperWords"); return; }
   var info=new ProcessStartInfo(exe); info.UseShellExecute=false;info.WorkingDirectory=Path.GetDirectoryName(exe);
   info.EnvironmentVariables["PORTABLE_EXECUTABLE_DIR"]=root;
   Process.Start(info);
  } catch(Exception e) { MessageBox.Show("启动失败："+e.Message,"PaperWords"); }
 }
}
