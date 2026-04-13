export async function executeAdminMutation({ mutation, revalidator, onSuccess, onError }) {
  try {
    const result = await mutation()
    onSuccess?.(result)
    revalidator.revalidate()
    return result
  } catch (err) {
    onError?.(err)
    return null
  }
}
