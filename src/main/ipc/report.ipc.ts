import { ipcMain, dialog, BrowserWindow } from 'electron'
import { generateReport, generateReportHtml, ReportType } from '../services/report.service'
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
    let text = `${report.title}\n\n`
    text += `时间范围: ${report.startDate} ~ ${report.endDate}\n`
    text += `总任务: ${report.summary.total} | 已完成: ${report.summary.completed} | 进行中: ${report.summary.inProgress} | 待办: ${report.summary.todo}\n\n`
    text += '【完成事项】\n'
    report.completedTasks.forEach((t, i) => { text += `  ${i+1}. [${t.priority}] ${t.title}\n` })
    text += '\n【进行中事项】\n'
    report.inProgressTasks.forEach((t, i) => { text += `  ${i+1}. [${t.priority}] ${t.title}\n` })
    text += '\n【待办事项】\n'
    report.todoTasks.forEach((t, i) => { text += `  ${i+1}. [${t.priority}] ${t.title}\n` })
    text += '\n由 NoteWorks 自动生成'

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
