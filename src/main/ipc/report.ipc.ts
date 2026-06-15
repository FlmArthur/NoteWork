import { ipcMain, dialog, BrowserWindow } from 'electron'
import { generateReport, generateReportHtml, generateReportText, ReportType } from '../services/report.service'
import fs from 'fs'
import path from 'path'

export function registerReportIpc(): void {
  ipcMain.handle('report:preview', (_event, type: ReportType, date: string) => {
    const report = generateReport(type, date)
    const html = generateReportHtml(report)
    return { html, report }
  })

  ipcMain.handle('report:export-html', async (_event, type: ReportType, date: string) => {
    const report = generateReport(type, date)
    const html = generateReportHtml(report)

    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      title: '导出报告',
      defaultPath: `${report.title}.html`,
      filters: [{ name: 'HTML 文件', extensions: ['html'] }]
    })

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, html, 'utf-8')
      return { success: true, filePath: result.filePath }
    }
    return { success: false }
  })

  ipcMain.handle('report:export-txt', async (_event, type: ReportType, date: string) => {
    const report = generateReport(type, date)
    const text = generateReportText(report)

    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      title: '导出报告',
      defaultPath: `${report.title}.txt`,
      filters: [{ name: '文本文件', extensions: ['txt'] }]
    })

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, text, 'utf-8')
      return { success: true, filePath: result.filePath }
    }
    return { success: false }
  })
}
