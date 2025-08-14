import React from 'react';
import { useForm } from 'react-hook-form';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface TestFormValues {
  salePerson: string;
  eyeTest: string;
  fitting: string;
}

const FormTest: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TestFormValues>({
    defaultValues: {
      salePerson: '',
      eyeTest: '',
      fitting: '',
    },
  });

  const onSubmit = (data: TestFormValues) => {
    console.log('Form data:', data);
    alert(`Sale Person: ${data.salePerson}, Eye Test: ${data.eyeTest}, Fitting: ${data.fitting}`);
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Staff Information Test</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Sale Person"
          {...register('salePerson', { required: 'Sale person is required' })}
          error={errors.salePerson?.message}
          placeholder="Enter sale person name"
        />
        <Input
          label="Eye Test"
          {...register('eyeTest', { required: 'Eye test person is required' })}
          error={errors.eyeTest?.message}
          placeholder="Enter eye test person name"
        />
        <Input
          label="Fitting"
          {...register('fitting', { required: 'Fitting person is required' })}
          error={errors.fitting?.message}
          placeholder="Enter fitting person name"
        />
        <Button type="submit" className="w-full">
          Test Submit
        </Button>
      </form>
    </div>
  );
};

export default FormTest;