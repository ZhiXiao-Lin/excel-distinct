import ProForm, {
  ProFormCheckbox,
  ProFormRadio,
  ProFormUploadButton,
  ProFormUploadDragger,
} from '@ant-design/pro-form';
import { PageContainer } from '@ant-design/pro-layout';
import { useReactive } from 'ahooks';
import { FormInstance, message } from 'antd';
import * as Excel from 'exceljs';
import { useRef } from 'react';
import { API } from '../constants';

export default function IndexPage() {
  const formRef = useRef<FormInstance>();
  const state = useReactive({
    loading: false,
    data: [],
    excels: [],
    sheets: [],
    columns: [],
  });

  const loadData = async (file, name) => {
    const workbook = new Excel.Workbook();
    const wb = await workbook.xlsx.load(file);
    const sheets: any[] = [];
    wb.eachSheet((ws) => {
      const rows: any[] = [];
      const columns: string[] = [];
      ws.eachRow((row, index) => {
        if (index === 1) {
          row.eachCell((cell) => {
            columns.push(cell.value?.toString().trim() ?? ' ');
          });
        } else {
          const cells: any[] = [];
          columns.forEach((c, i) => {
            cells.push(
              row
                .getCell(i + 1)
                .value?.toString()
                .trim() ?? ' ',
            );
          });
          rows.push(cells);
        }
      });
      sheets.push({ name: ws.name, columns, rows });
    });
    return { name, sheets };
  };

  const handleSubmit = async (e) => {
    try {
      state.loading = true;
      message.loading('正在处理');

      const mainExcel = state.data[e.mainExcel];
      const mainSheet = mainExcel.sheets[e.mainSheet];
      const mainRows = mainSheet.rows ?? [];

      const rows = new Set();

      for (let i = 0; i < state.data.length; i++) {
        const excel = state.data[i];
        for (let j = 0; j < excel.sheets.length; j++) {
          const sheet = excel.sheets[j];
          if (i === e.mainExcel && j === e.mainSheet) {
            continue;
          }
          for (let row of sheet.rows) {
            const index = mainRows.findIndex((r) => {
              let flag = true;
              for (let column of e.columns) {
                flag = r[column] === row[column];
                if (!flag) break;
              }
              return flag;
            });
            if (index >= 0) {
              rows.add(index);
            }
          }
        }
      }

      const workbook = new Excel.Workbook();

      const sheet = workbook.addWorksheet(mainSheet.name);

      sheet.columns = mainSheet.columns.map((c) => ({
        header: c,
        key: c,
        width: 20,
      }));
      for (let row of mainRows) {
        const r = sheet.addRow(row);
        if (rows.has(r.number - 2)) {
          for (let i = 0; i < mainSheet.columns.length; i++) {
            r.getCell(i + 1).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFF00' },
              bgColor: { argb: 'FF0000FF' },
            };
          }
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();

      await API.writeFile(e.path[0].originFileObj.path, buffer);

      state.loading = false;
      message.destroy();
      message.success('保存成功');
    } catch (err) {
      state.loading = false;
      console.log(err);
      message.destroy();
      message.error('处理失败');
    }
  };

  return (
    <PageContainer title="EXCEL重复项筛选器">
      <ProForm
        submitter={{
          searchConfig: { submitText: '立即处理' },
          submitButtonProps: { loading: state.loading },
        }}
        formRef={formRef}
        onValuesChange={(e) => {
          if (e.mainExcel) {
            state.sheets =
              state.data[e.mainExcel].sheets?.map((s, index) => ({
                label: s.name,
                value: index,
              })) ?? [];
            formRef?.current?.setFieldsValue({
              mainSheet: 0,
              columns: [],
            });
          }
          if (e.mainSheet) {
            state.columns =
              state.data[formRef?.current?.getFieldValue('mainExcel')].sheets[
                e.mainSheet
              ]?.columns.map((c, index) => ({
                label: c,
                value: index,
              })) ?? [];
            formRef?.current?.setFieldsValue({
              columns: [],
            });
          }
        }}
        onReset={() => {
          state.data = [];
          state.excels = [];
          state.sheets = [];
          state.columns = [];
        }}
        onFinish={handleSubmit}
      >
        <ProFormUploadDragger
          label="导入文件"
          name="files"
          placeholder="请导入 EXCEL 文件"
          fieldProps={{
            multiple: true,
            maxCount: 5,
            beforeUpload: () => false,
            onChange: async (e) => {
              const names = new Set();
              const files = await Promise.all(
                e.fileList.map(async (f) => {
                  if (!names.has(f.name)) {
                    names.add(f.name);
                    return {
                      name: f.name,
                      data: await API.readFile(f.originFileObj.path),
                    };
                  }
                }),
              );
              const data = await Promise.all(
                files
                  .filter((f) => !!f && !!f.data)
                  .map((f) => loadData(f.data, f.name)),
              );
              state.data = data;
              state.excels =
                data?.map((d, index) => ({
                  label: d.name,
                  value: index,
                })) ?? [];
              state.sheets =
                data[0]?.sheets?.map((s, index) => ({
                  label: s.name,
                  value: index,
                })) ?? [];
              state.columns =
                data[0]?.sheets[0]?.columns?.map((c, index) => ({
                  label: c,
                  value: index,
                })) ?? [];
              formRef.current?.setFieldsValue({
                mainExcel: 0,
                mainSheet: 0,
                columns: [],
              });
            },
            accept:
              'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }}
          rules={[{ required: true, message: '请导入 EXCEL 文件' }]}
        />
        {state.excels?.length > 0 && (
          <>
            <ProFormRadio.Group
              label="主文件"
              name="mainExcel"
              options={state.excels}
              rules={[{ required: true, message: '请选择主文件' }]}
            />

            <ProFormRadio.Group
              label="主表"
              name="mainSheet"
              options={state.sheets}
              rules={[{ required: true, message: '请选择主表' }]}
            />

            <ProFormCheckbox.Group
              label="对比列"
              name="columns"
              options={state.columns}
              rules={[{ required: true, message: '请选择对比列' }]}
            />

            <ProFormUploadButton
              label="执行结果保存的路径"
              name="path"
              icon=""
              title="选择路径"
              fieldProps={{
                maxCount: 1,
                listType: 'text',
                accept:
                  'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              }}
              rules={[{ required: true, message: '请选择执行结果保存的路径' }]}
            />
          </>
        )}
      </ProForm>
    </PageContainer>
  );
}
